const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

router.use(authenticate);

router.get('/', transactionController.getTransactions);
router.get('/stats/monthly', transactionController.getMonthlyStats);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
