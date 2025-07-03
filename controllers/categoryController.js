const Category = require('../models/Category');

// Get all categories for the logged-in user
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ created_by: req.user._id });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new category for the logged-in user
exports.createCategory = async (req, res) => {
  try {
    let category = await Category.findOne({ name: req.body.name, created_by: req.user._id });
    if (category) return res.json(category);

    category = new Category({ name: req.body.name, created_by: req.user._id });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};