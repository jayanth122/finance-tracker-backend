const transactionService = require('../services/transactionService');

exports.getTransactions = async (req, res) => {
  try {
    const { type, accountId, categoryId, startDate, endDate } = req.query;
    const transactions = await transactionService.getAllTransactions(req.user.id, {
      type,
      accountId,
      categoryId,
      startDate,
      endDate,
    });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await transactionService.getTransactionById(
      req.user.id,
      req.params.id
    );
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { date, amount, type, account_id, from_account, to_account } = req.body;
    if (!date || amount === undefined || !type) {
      return res.status(400).json({ error: 'date, amount, and type are required.' });
    }

    if (['income', 'expense'].includes(type) && !account_id) {
      return res.status(400).json({ error: 'account_id is required for income and expense transactions.' });
    }
    if (type === 'transfer_out' && !from_account) {
      return res.status(400).json({ error: 'from_account is required for transfer_out transactions.' });
    }
    if (type === 'transfer_in' && !to_account) {
      return res.status(400).json({ error: 'to_account is required for transfer_in transactions.' });
    }

    const transaction = await transactionService.createTransaction(req.user.id, req.body);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTransfer = async (req, res) => {
  try {
    const { date, amount, from_account, to_account } = req.body;

    if (!date || amount === undefined || !from_account || !to_account) {
      return res.status(400).json({
        error: 'date, amount, from_account, and to_account are required.',
      });
    }

    if (from_account === to_account) {
      return res.status(400).json({ error: 'from_account and to_account must be different.' });
    }

    const transferResult = await transactionService.createTransfer(req.user.id, req.body);
    res.status(201).json(transferResult);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id, user_id, created_at, updated_at, ...payload } = req.body;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'At least one updatable field is required.' });
    }

    const transaction = await transactionService.updateTransaction(
      req.user.id,
      req.params.id,
      payload
    );
    res.status(200).json(transaction);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const result = await transactionService.deleteTransaction(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.getMonthlyStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const stats = await transactionService.getMonthlyStats(
      req.user.id,
      parseInt(month) || now.getMonth() + 1,
      parseInt(year) || now.getFullYear()
    );
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
