const Resource = require('../models/Resource');
const ProgressLog = require('../models/ProgressLog');
const Category = require('../models/Category');
const mongoose = require('mongoose');

// GET /api/resources/
exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find({ user_id: req.user._id }).populate('category_id', 'name');

    // Build resourcesWithProgress with progress fields
    const resourcesWithProgress = await Promise.all(
      resources.map(async (resource) => {
        const progress = await ProgressLog.findOne({
          user_id: req.user._id,
          resource_id: resource._id
        }).sort({ completion_date: -1 });

        return {
          ...resource.toObject(),
          isCompleted: progress?.completion_status === 'completed',
          time_spent: progress?.time_spent || 0,
          completion_date: progress?.completion_date || null
        };
      })
    );

    // Group the resourcesWithProgress array
    const grouped = {};
    resourcesWithProgress.forEach((res) => {
      const cat = res.category_id?.name || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(res);
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
    console.error('Error in markResourceComplete:', err); // <-- Add this line
    res.status(500).json({ error: err.message });
  }
};

// GET /api/resources/summary/data
exports.getSummary = async (req, res) => {
  try {
    const categories = await Category.find({ created_by: req.user._id });

    let totalResources = 0;
    let totalTimeSpent = 0;
    const categoryStats = {};

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
      const timeSpent = progressLogs
        .filter(p => p.completion_status === 'completed')
        .reduce((sum, p) => sum + (p.time_spent || 0), 0);

      totalResources += total;
      totalTimeSpent += timeSpent;

      categoryStats[category.name] = {
        totalResources: total,
        completedResources: completed,
        completionPercent: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
        timeSpent
      };
    }

    // Handle uncategorized resources
    const uncategorizedResources = await Resource.find({
      user_id: req.user._id,
      $or: [{ category_id: { $exists: false } }, { category_id: null }]
    });

    if (uncategorizedResources.length > 0) {
      const resourceIds = uncategorizedResources.map(r => r._id);
      const progressLogs = await ProgressLog.find({
        user_id: req.user._id,
        resource_id: { $in: resourceIds }
      });

      const total = uncategorizedResources.length;
      const completed = progressLogs.filter(p => p.completion_status === 'completed').length;
      const timeSpent = progressLogs
        .filter(p => p.completion_status === 'completed')
        .reduce((sum, p) => sum + (p.time_spent || 0), 0);

      totalResources += total;
      totalTimeSpent += timeSpent;

      categoryStats['Uncategorized'] = {
        totalResources: total,
        completedResources: completed,
        completionPercent: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
        timeSpent
      };
    }

    res.json({
      totalResources,
      totalTimeSpent,
      categoryStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// PUT /api/resources/:id
exports.updateResource = async (req, res) => {
  const { title, type, description, category_id } = req.body;
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { title, type, description, category_id },
      { new: true }
    );

    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/resources/:id
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id
    });

    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

