const categoryService = require('../services/categoryService');

exports.getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getCategories(req.user.id);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, kind } = req.body;
    if (!name || !kind) {
      return res.status(400).json({ error: 'name and kind are required.' });
    }

    const category = await categoryService.createCategory(req.user.id, { name, kind });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id, user_id, created_at, updated_at, ...payload } = req.body;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'At least one updatable field is required.' });
    }

    const category = await categoryService.updateCategory(
      req.user.id,
      req.params.id,
      payload
    );
    res.status(200).json(category);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const result = await categoryService.deleteCategory(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.getSubcategories = async (req, res) => {
  try {
    const subcategories = await categoryService.getSubcategories(
      req.user.id,
      req.params.categoryId
    );
    res.status(200).json(subcategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSubcategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }

    const subcategory = await categoryService.createSubcategory(
      req.user.id,
      req.params.categoryId,
      { name }
    );

    res.status(201).json(subcategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSubcategory = async (req, res) => {
  try {
    const { id, user_id, category_id, created_at, updated_at, ...payload } = req.body;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'At least one updatable field is required.' });
    }

    const subcategory = await categoryService.updateSubcategory(
      req.user.id,
      req.params.id,
      payload
    );
    res.status(200).json(subcategory);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

exports.deleteSubcategory = async (req, res) => {
  try {
    const result = await categoryService.deleteSubcategory(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
