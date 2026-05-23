const supabase = require('../config/supabase');

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const baseSelect = `
  *,
  account:accounts(id, name, type, currency),
  category:categories(id, name, kind),
  subcategory:subcategories(id, name)
`;

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

const createTransaction = async (userId, payload) => {
  const { amount, type, account_id, from_account, to_account } = payload;

  try {
    // Helper function to update account balance
    const updateAccountBalance = async (acctId, delta) => {
      const { data: account, error: fetchErr } = await supabase
        .from('accounts')
        .select('opening_balance')
        .eq('user_id', userId)
        .eq('id', acctId)
        .single();

      if (fetchErr) throw new Error(`Account not found: ${acctId}`);
      
      const newBalance = (account.opening_balance || 0) + delta;
      const { error: updateErr } = await supabase
        .from('accounts')
        .update({ opening_balance: newBalance })
        .eq('user_id', userId)
        .eq('id', acctId);
      
      if (updateErr) throw new Error(`Failed to update account balance: ${updateErr.message}`);
    };

    // Update account balance based on transaction type
    if (type === 'income' && account_id) {
      await updateAccountBalance(account_id, amount);
    } else if (type === 'expense' && account_id) {
      await updateAccountBalance(account_id, -amount);
    } else if (type === 'transfer_out' && from_account) {
      await updateAccountBalance(from_account, -amount);
    } else if (type === 'transfer_in' && to_account) {
      await updateAccountBalance(to_account, amount);
    }

    // Insert transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...payload, user_id: userId })
      .select(baseSelect)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw new Error(`Transaction creation failed: ${err.message}`);
  }
};

const updateTransaction = async (userId, id, payload) => {
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
};

const deleteTransaction = async (userId, id) => {
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
    .filter((t) => t.type === 'income' || t.type === 'transfer_in')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = data
    .filter((t) => t.type === 'expense' || t.type === 'transfer_out')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return { income, expenses, net: income - expenses };
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getMonthlyStats,
};
