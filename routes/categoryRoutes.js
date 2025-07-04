const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { getCategories, createCategory } = require('../controllers/categoryController');

router.use(protect);

router.get('/', getCategories);
router.post('/', createCategory);

module.exports = router;