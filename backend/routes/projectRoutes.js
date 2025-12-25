const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * @route   POST /api/admin/projects
 * @desc    Create project for a student (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.post(
  '/admin/projects',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  projectController.createProject
);

/**
 * @route   GET /api/admin/projects
 * @desc    Get all projects (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/projects',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  projectController.getAllProjects
);

/**
 * @route   GET /api/admin/projects/student/:studentId
 * @desc    Get all projects for a specific student (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/projects/student/:studentId',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  projectController.getStudentProjects
);

/**
 * @route   GET /api/admin/projects/:id
 * @desc    Get project by ID (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.get(
  '/admin/projects/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  projectController.getProjectById
);

/**
 * @route   PUT /api/admin/projects/:id
 * @desc    Update project (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.put(
  '/admin/projects/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  projectController.updateProject
);

/**
 * @route   DELETE /api/admin/projects/:id
 * @desc    Delete project (Admin/Super Admin only)
 * @access  Private (Admin, Super Admin)
 */
router.delete(
  '/admin/projects/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  projectController.deleteProject
);

/**
 * @route   GET /api/student/projects
 * @desc    Get student's own projects (Student only)
 * @access  Private (Student)
 */
router.get(
  '/student/projects',
  authenticate,
  authorize('STUDENT'),
  projectController.getStudentProjects
);

/**
 * @route   GET /api/student/projects/:id
 * @desc    Get student's own project by ID (Student only)
 * @access  Private (Student)
 */
router.get(
  '/student/projects/:id',
  authenticate,
  authorize('STUDENT'),
  projectController.getProjectById
);

module.exports = router;

