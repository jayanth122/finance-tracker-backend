const supabase = require('../config/supabase');

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const getAccounts = async (userId) => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

const createAccount = async (userId, payload) => {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const updateAccount = async (userId, id, payload) => {
  const { data, error } = await supabase
    .from('accounts')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createNotFoundError('Account not found.');
  return data;
};

const deleteAccount = async (userId, id) => {
  const { data, error } = await supabase
    .from('accounts')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createNotFoundError('Account not found.');
  return { success: true };
};

module.exports = { getAccounts, createAccount, updateAccount, deleteAccount };
