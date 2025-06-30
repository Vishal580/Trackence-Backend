const Resource = require('../models/Resource');
const ProgressLog = require('../models/ProgressLog');
const Category = require('../models/Category');
const mongoose = require('mongoose');

// GET /api/resources/
exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find({ user_id: req.user._id }).populate('category_id', 'name');
    
    const grouped = {};
    resources.forEach(resource => {
      const categoryName = resource.category_id.name || 'Uncategorized';
      if (!grouped[categoryName]) grouped[categoryName] = [];
      grouped[categoryName].push(resource);
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/resources/
exports.createResource = async (req, res) => {
  const { title, type, description, category_id } = req.body;
  try {
    const resource = new Resource({
      user_id: req.user._id,
      title,
      type,
      description,
      category_id
    });

    await resource.save();
    res.status(201).json(resource);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/resources/:id
exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findOne({
      _id: req.params.id,
      user_id: req.user._id
    }).populate('category_id', 'name');

    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/resources/:id/mark-complete
exports.markResourceComplete = async (req, res) => {
  const { time_spent } = req.body;

  try {
    const existingLog = await ProgressLog.findOne({
      user_id: req.user._id,
      resource_id: req.params.id
    });

    if (existingLog) {
      existingLog.completion_status = 'completed';
      existingLog.time_spent = time_spent;
      existingLog.completion_date = new Date();
      await existingLog.save();
    } else {
      await ProgressLog.create({
        user_id: req.user._id,
        resource_id: req.params.id,
        completion_status: 'completed',
        time_spent,
        completion_date: new Date()
      });
    }

    res.json({ message: 'Marked as completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/resources/summary/data
exports.getSummary = async (req, res) => {
  try {
    const categories = await Category.find({ created_by: req.user._id });
    const summary = [];

    for (const category of categories) {
      const resources = await Resource.find({
        user_id: req.user._id,
        category_id: category._id
      });

      const resourceIds = resources.map(r => r._id);
      const progressLogs = await ProgressLog.find({
        user_id: req.user._id,
        resource_id: { $in: resourceIds }
      });

      const total = resources.length;
      const completed = progressLogs.filter(p => p.completion_status === 'completed').length;
      const timeSpent = progressLogs.reduce((sum, p) => sum + (p.time_spent || 0), 0);

      summary.push({
        category: category.name,
        totalResources: total,
        completedResources: completed,
        completionPercent: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
        timeSpent
      });
    }

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
