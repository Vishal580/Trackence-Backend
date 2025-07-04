const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  getAllResources,
  createResource,
  getResourceById,
  markResourceComplete,
  getSummary,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');

router.use(protect); // Protect all resource routes

router.get('/', getAllResources);
router.post('/', createResource);
router.get('/:id', getResourceById);
router.post('/:id/mark-complete', markResourceComplete);
router.get('/summary/data', getSummary); // adjusted to avoid route conflict with `/:id`
router.put('/:id', updateResource);
router.delete('/:id', deleteResource);

module.exports = router;
