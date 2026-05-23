const supabase = require('../config/supabase');

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

const getCategories = async (userId) => {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      subcategories:subcategories(*)
    `)
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

const createCategory = async (userId, payload) => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const updateCategory = async (userId, id, payload) => {
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createNotFoundError('Category not found.');
  return data;
};

const deleteCategory = async (userId, id) => {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createNotFoundError('Category not found.');
  return { success: true };
};

const getSubcategories = async (userId, categoryId) => {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
};

const createSubcategory = async (userId, categoryId, payload) => {
  const { data, error } = await supabase
    .from('subcategories')
    .insert({ ...payload, user_id: userId, category_id: categoryId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const updateSubcategory = async (userId, id, payload) => {
  const { data, error } = await supabase
    .from('subcategories')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createNotFoundError('Subcategory not found.');
  return data;
};

const deleteSubcategory = async (userId, id) => {
  const { data, error } = await supabase
    .from('subcategories')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createNotFoundError('Subcategory not found.');
  return { success: true };
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
};
