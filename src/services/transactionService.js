const crypto = require('crypto');
const supabase = require('../config/supabase');

const FALLBACK_TRANSACTION_COLUMNS = new Set([
  'user_id',
  'date',
  'amount',
  'type',
  'account_id',
  'category_id',
  'subcategory_id',
  'note',
  'description',
]);

const baseSelect = `
  *,
  account:accounts(id, name, type, currency),
  category:categories(id, name, kind),
  subcategory:subcategories(id, name)
`;

let transactionsColumnSet = null;

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const createBadRequestError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const toNumericAmount = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    throw createBadRequestError('Amount must be a valid number.');
  }
  return value;
};

const getTransactionsColumnSet = async () => {
  if (transactionsColumnSet) return transactionsColumnSet;

  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'transactions');

  if (error || !data || data.length === 0) {
    transactionsColumnSet = FALLBACK_TRANSACTION_COLUMNS;
    return transactionsColumnSet;
  }

  transactionsColumnSet = new Set(data.map((column) => column.column_name));
  return transactionsColumnSet;
};

const sanitizeTransactionInsertPayload = async (payload) => {
  const columns = await getTransactionsColumnSet();
  return Object.fromEntries(Object.entries(payload).filter(([key]) => columns.has(key)));
};

const extractMissingColumnFromError = (errorMessage = '') => {
  const match = /Could not find the '([^']+)' column/.exec(errorMessage);
  return match ? match[1] : null;
};

const insertTransactionsWithSchemaFallback = async (rows, maxRetries = 5) => {
  let payloadRows = rows.map((row) => ({ ...row }));

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(payloadRows)
      .select(baseSelect);

    if (!error) return data;

    const missingColumn = extractMissingColumnFromError(error.message);
    if (!missingColumn || attempt === maxRetries) {
      throw error;
    }

    payloadRows = payloadRows.map((row) => {
      const nextRow = { ...row };
      delete nextRow[missingColumn];
      return nextRow;
    });
  }

  return [];
};

const getAccountById = async (userId, accountId) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, opening_balance')
    .eq('user_id', userId)
    .eq('id', accountId)
    .single();

  if (error || !data) {
    throw createNotFoundError(`Account not found: ${accountId}`);
  }

  return data;
};

const setAccountBalance = async (userId, accountId, newBalance) => {
  const { error } = await supabase
    .from('accounts')
    .update({ opening_balance: newBalance })
    .eq('user_id', userId)
    .eq('id', accountId);

  if (error) {
    throw new Error(`Failed to update account ${accountId}: ${error.message}`);
  }
};

const applyBalanceDelta = async (userId, deltaByAccountId) => {
  for (const [accountId, delta] of Object.entries(deltaByAccountId)) {
    const numericDelta = Number(delta || 0);
    if (!numericDelta) continue;

    const account = await getAccountById(userId, accountId);
    const nextBalance = Number(account.opening_balance || 0) + numericDelta;
    await setAccountBalance(userId, accountId, nextBalance);
  }
};

const invertDelta = (deltaByAccountId) => {
  return Object.fromEntries(
    Object.entries(deltaByAccountId).map(([accountId, delta]) => [accountId, -Number(delta || 0)])
  );
};

const getSignedAmountImpact = (type, amount) => {
  const numericAmount = toNumericAmount(amount);
  if (type === 'income' || type === 'transfer_in') return numericAmount;
  if (type === 'expense' || type === 'transfer_out') return -numericAmount;
  return 0;
};

const getTransactionImpactByAccount = (transaction) => {
  if (!transaction?.account_id) return {};

  const impact = getSignedAmountImpact(transaction.type, transaction.amount);
  if (!impact) return {};

  return { [String(transaction.account_id)]: impact };
};

const diffImpact = (oldImpact, newImpact) => {
  const accountIds = new Set([...Object.keys(oldImpact), ...Object.keys(newImpact)]);
  const delta = {};

  for (const accountId of accountIds) {
    const oldValue = Number(oldImpact[accountId] || 0);
    const newValue = Number(newImpact[accountId] || 0);
    const difference = newValue - oldValue;

    if (difference !== 0) {
      delta[accountId] = difference;
    }
  }

  return delta;
};

const getAllTransactions = async (userId, filters = {}) => {
  let query = supabase
    .from('transactions')
    .select(baseSelect)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  if (filters.type) query = query.eq('type', filters.type);
  if (filters.accountId) query = query.eq('account_id', filters.accountId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.startDate) query = query.gte('date', filters.startDate);
  if (filters.endDate) query = query.lte('date', filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  return data;
};

const getTransactionById = async (userId, id) => {
  const { data, error } = await supabase
    .from('transactions')
    .select(baseSelect)
    .eq('user_id', userId)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

const resolveSingleTransactionAccountId = (payload) => {
  const { type, account_id, from_account, to_account } = payload;

  if (type === 'income' || type === 'expense') return account_id;
  if (type === 'transfer_out') return from_account || account_id;
  if (type === 'transfer_in') return to_account || account_id;
  return account_id;
};

const createTransaction = async (userId, payload) => {
  const numericAmount = toNumericAmount(payload.amount);
  const accountId = resolveSingleTransactionAccountId(payload);

  const deltaByAccountId = {};
  if (accountId) {
    deltaByAccountId[String(accountId)] = getSignedAmountImpact(payload.type, numericAmount);
  }

  const insertPayload = await sanitizeTransactionInsertPayload({
    ...payload,
    amount: numericAmount,
    account_id: payload.account_id || accountId,
    user_id: userId,
  });

  await applyBalanceDelta(userId, deltaByAccountId);

  try {
    const data = await insertTransactionsWithSchemaFallback([insertPayload]);
    return data[0] || null;
  } catch (error) {
    await applyBalanceDelta(userId, invertDelta(deltaByAccountId));
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
};

const createTransfer = async (userId, payload) => {
  const {
    date,
    amount,
    from_account,
    to_account,
    category_id,
    subcategory_id,
    description,
    note,
  } = payload;

  const numericAmount = toNumericAmount(amount);
  if (numericAmount <= 0) {
    throw createBadRequestError('Amount must be a positive number.');
  }

  if (!from_account || !to_account) {
    throw createBadRequestError('from_account and to_account are required.');
  }

  if (String(from_account) === String(to_account)) {
    throw createBadRequestError('from_account and to_account must be different.');
  }

  await getAccountById(userId, from_account);
  await getAccountById(userId, to_account);

  const transferReference = crypto.randomUUID();
  const transferDelta = {
    [String(from_account)]: -numericAmount,
    [String(to_account)]: numericAmount,
  };

  const basePayload = {
    date,
    amount: numericAmount,
    category_id,
    subcategory_id,
    description,
    note,
    user_id: userId,
  };

  const transferOutPayload = await sanitizeTransactionInsertPayload({
    ...basePayload,
    type: 'transfer_out',
    account_id: from_account,
  });

  const transferInPayload = await sanitizeTransactionInsertPayload({
    ...basePayload,
    type: 'transfer_in',
    account_id: to_account,
  });

  let createdTransactions = [];

  await applyBalanceDelta(userId, transferDelta);

  try {
    createdTransactions = await insertTransactionsWithSchemaFallback([
      transferOutPayload,
      transferInPayload,
    ]);

    return {
      reference: transferReference,
      amount: numericAmount,
      from_account,
      to_account,
      transactions: createdTransactions,
    };
  } catch (error) {
    try {
      if (createdTransactions.length > 0) {
        const createdIds = createdTransactions.map((transaction) => transaction.id);
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', userId)
          .in('id', createdIds);
      }

      await applyBalanceDelta(userId, invertDelta(transferDelta));
    } catch (rollbackError) {
      throw new Error(`Transfer failed and rollback failed: ${rollbackError.message}`);
    }

    const wrappedError = new Error(`Transfer creation failed: ${error.message}`);
    wrappedError.status = error.status || 500;
    throw wrappedError;
  }
};

const updateTransaction = async (userId, id, payload) => {
  const { data: existing, error: existingError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) throw createNotFoundError('Transaction not found.');

  const merged = { ...existing, ...payload };
  const oldImpact = getTransactionImpactByAccount(existing);
  const newImpact = getTransactionImpactByAccount(merged);
  const delta = diffImpact(oldImpact, newImpact);

  await applyBalanceDelta(userId, delta);

  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('user_id', userId)
      .eq('id', id)
      .select(baseSelect)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw createNotFoundError('Transaction not found.');
    return data;
  } catch (error) {
    await applyBalanceDelta(userId, invertDelta(delta));
    throw error;
  }
};

const deleteTransaction = async (userId, id) => {
  const { data: existing, error: existingError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) throw createNotFoundError('Transaction not found.');

  const reverseImpact = invertDelta(getTransactionImpactByAccount(existing));
  await applyBalanceDelta(userId, reverseImpact);

  try {
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw createNotFoundError('Transaction not found.');
    return { success: true };
  } catch (error) {
    await applyBalanceDelta(userId, invertDelta(reverseImpact));
    throw error;
  }
};

const getMonthlyStats = async (userId, month, year) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  const income = data
    .filter((transaction) => transaction.type === 'income' || transaction.type === 'transfer_in')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const expenses = data
    .filter((transaction) => transaction.type === 'expense' || transaction.type === 'transfer_out')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return { income, expenses, net: income - expenses };
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  createTransfer,
  updateTransaction,
  deleteTransaction,
  getMonthlyStats,
};
