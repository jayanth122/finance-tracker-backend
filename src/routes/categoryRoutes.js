const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

router.get('/:categoryId/subcategories', categoryController.getSubcategories);
router.post('/:categoryId/subcategories', categoryController.createSubcategory);
router.put('/subcategories/:id', categoryController.updateSubcategory);
router.delete('/subcategories/:id', categoryController.deleteSubcategory);

module.exports = router;
