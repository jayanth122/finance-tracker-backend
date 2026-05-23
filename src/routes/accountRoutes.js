const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const accountController = require('../controllers/accountController');

router.use(authenticate);

router.get('/', accountController.getAccounts);
router.post('/', accountController.createAccount);
router.put('/:id', accountController.updateAccount);
router.patch('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

module.exports = router;
