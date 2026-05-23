const accountService = require('../services/accountService');

const ACCOUNT_TYPES = ['debit', 'credit', 'bank', 'cash', 'investments'];

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await accountService.getAccounts(req.user.id);
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { name, type, currency, opening_balance, is_active } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required.' });
    }

    if (!ACCOUNT_TYPES.includes(type)) {
      return res.status(400).json({
        error: `type must be one of: ${ACCOUNT_TYPES.join(', ')}`,
      });
    }

    const account = await accountService.createAccount(req.user.id, {
      name,
      type,
      currency,
      opening_balance,
      is_active,
    });

    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { type, id, user_id, created_at, updated_at, ...payload } = req.body;

    if (Object.keys(payload).length === 0 && !type) {
      return res.status(400).json({ error: 'At least one updatable field is required.' });
    }

    if (type && !ACCOUNT_TYPES.includes(type)) {
      return res.status(400).json({
        error: `type must be one of: ${ACCOUNT_TYPES.join(', ')}`,
      });
    }

    const account = await accountService.updateAccount(
      req.user.id,
      req.params.id,
      { ...payload, ...(type ? { type } : {}) }
    );
    res.status(200).json(account);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const result = await accountService.deleteAccount(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
