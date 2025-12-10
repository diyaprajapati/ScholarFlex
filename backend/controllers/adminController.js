const { validationResult } = require('express-validator');
const pool = require('../config/database');
const { prisma } = require('../config/database');
const User = require('../models/User');
const { logActivitySimple } = require('../middleware/activityLogger');

/**
 * Create a new admin (Super Admin only)
 */
const createAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, full_name, role_code } = req.body;

    // Check if user already exists
    const userExists = await User.exists(email);
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Get role_id based on role_code (ADMIN or SUPER_ADMIN)
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE role_code = $1",
      [role_code]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role code',
      });
    }

    const role_id = roleResult.rows[0].id;

    // Create admin user
    const newAdmin = await User.create({
      email,
      full_name,
      role_id,
      created_by: req.user.id,
    });

    // Log the activity
    await logActivitySimple(
      req,
      'CREATE_ADMIN',
      'USER',
      newAdmin.id,
      `${req.user.email} created new admin: ${email}`
    );

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        full_name: newAdmin.full_name,
        role: newAdmin.role_code,
        role_name: newAdmin.role_name,
      },
    });
  } catch (error) {
    console.error('Error in createAdmin:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all admins (Super Admin only)
 */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.getAllAdmins();

    // Log the activity
    await logActivitySimple(req, 'VIEW_ADMINS', 'USER', null, `${req.user.email} viewed all admins`);

    res.status(200).json({
      success: true,
      admins: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role_code,
        role_name: admin.role_name,
        is_active: admin.is_active,
        last_login_at: admin.last_login_at,
        created_at: admin.created_at,
      })),
    });
  } catch (error) {
    console.error('Error in getAllAdmins:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get admin by ID (Super Admin only)
 */
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.getAdminById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Log the activity
    await logActivitySimple(
      req,
      'VIEW_ADMIN',
      'USER',
      id,
      `${req.user.email} viewed admin: ${admin.email}`
    );

    res.status(200).json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role_code,
        role_name: admin.role_name,
        is_active: admin.is_active,
        last_login_at: admin.last_login_at,
        created_at: admin.created_at,
      },
    });
  } catch (error) {
    console.error('Error in getAdminById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update admin (Super Admin only)
 */
const updateAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { full_name, is_active, role_code } = req.body;

    // Check if admin exists
    const admin = await User.getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Allow super admin to update any admin (including other super admins)
    // Only prevent updating yourself to avoid accidental self-deactivation or role change
    if (parseInt(id) === req.user.id) {
      if (is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate your own account',
        });
      }
      if (role_code && role_code !== admin.role_code) {
        return res.status(403).json({
          success: false,
          message: 'Cannot change your own role',
        });
      }
    }

    // Prepare update data
    const updateData = { full_name, is_active };
    
    // If role_code is provided, get role_id
    if (role_code) {
      const roleResult = await pool.query(
        "SELECT id FROM roles WHERE role_code = $1",
        [role_code]
      );
      
      if (roleResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role code',
        });
      }
      
      updateData.role_id = roleResult.rows[0].id;
    }

    // Update admin
    const updatedAdmin = await User.update(id, updateData);

    // Log the activity
    await logActivitySimple(
      req,
      'UPDATE_ADMIN',
      'USER',
      id,
      `${req.user.email} updated admin: ${admin.email}`
    );

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        full_name: updatedAdmin.full_name,
        role: updatedAdmin.role_code,
        role_name: updatedAdmin.role_name,
        is_active: updatedAdmin.is_active,
      },
    });
  } catch (error) {
    console.error('Error in updateAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete admin (Super Admin only) - Soft delete
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if admin exists
    const admin = await User.getAdminById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Allow super admin to delete any admin (including other super admins)
    // Only prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Soft delete admin
    await User.delete(id);

    // Log the activity
    await logActivitySimple(
      req,
      'DELETE_ADMIN',
      'USER',
      id,
      `${req.user.email} deleted admin: ${admin.email}`
    );

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get student analytics for all selected students
 * GET /api/admin/students/analytics
 */
const getStudentAnalytics = async (req, res) => {
  try {
    // Get all selected students
    const selectedStudentsResult = await pool.query(
      `SELECT 
        s.id,
        s.email,
        s.full_name,
        s.phone,
        s.domain_id,
        d.domain_name,
        s.is_selected,
        s.created_at,
        s.updated_at
      FROM students s
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE s.is_active = TRUE
      AND s.is_selected = TRUE
      ORDER BY s.full_name ASC`
    );

    const students = selectedStudentsResult.rows;
    
    // Get all student IDs
    const studentIds = students.map(s => s.id);
    
    // Fetch all video activities for all selected students in a single query
    const allVideoActivities = await prisma.studentActivityLog.findMany({
      where: {
        studentId: {
          in: studentIds,
        },
        activityType: {
          in: ['video_start', 'video_complete', 'video_progress', 'VIDEO_START', 'VIDEO_COMPLETE', 'VIDEO_PROGRESS'],
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
    
    // Group activities by studentId
    const activitiesByStudent = new Map();
    allVideoActivities.forEach((activity) => {
      const studentId = activity.studentId;
      if (!activitiesByStudent.has(studentId)) {
        activitiesByStudent.set(studentId, []);
      }
      activitiesByStudent.get(studentId).push(activity);
    });
    
    // Process analytics for each student
    const analytics = students.map((student) => {
      const studentId = student.id;
      const videoActivities = activitiesByStudent.get(studentId) || [];

      // Track watch time per video and per day
      const videoWatchTimeMap = new Map(); // videoKey -> watchTime
      const dailyWatchTimeMap = new Map(); // date -> seconds
      const videosCompleted = new Set();
      const videosStarted = new Set();

      videoActivities.forEach((activity) => {
        const metadata = activity.metadata || {};
        const activityType = activity.activityType.toLowerCase();
        const videoId = metadata.videoId || metadata.video_id || null;
        const youtubeUrl = metadata.youtubeUrl || metadata.youtube_url || null;
        
        if (!videoId && !youtubeUrl) return;
        
        const videoKey = youtubeUrl || `video_${videoId}`;
        const activityDate = new Date(activity.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Initialize maps
        if (!videoWatchTimeMap.has(videoKey)) {
          videoWatchTimeMap.set(videoKey, {
            watchTime: 0,
            completed: false,
            videoTitle: metadata.videoTitle || metadata.video_title || 'Unknown Video',
          });
        }
        
        if (!dailyWatchTimeMap.has(activityDate)) {
          dailyWatchTimeMap.set(activityDate, 0);
        }

        const videoData = videoWatchTimeMap.get(videoKey);

        // Video completed - use full duration
        if (activityType === 'video_complete') {
          videosCompleted.add(videoKey);
          videosStarted.add(videoKey);
          videoData.completed = true;
          const duration = metadata.duration || 0;
          if (duration > 0) {
            videoData.watchTime = duration;
            // Add to daily watch time
            dailyWatchTimeMap.set(activityDate, dailyWatchTimeMap.get(activityDate) + duration);
          }
        }

        // Video progress - track actual currentTime watched
        if (activityType === 'video_progress') {
          videosStarted.add(videoKey);
          const currentTime = metadata.currentTime || metadata.current_time || 0;
          if (currentTime > 0) {
            // Update max watch time for this video
            if (currentTime > videoData.watchTime) {
              videoData.watchTime = currentTime;
            }
            // For daily tracking, use the currentTime from this progress event
            // This represents the time watched up to this point on this day
            // We'll use the maximum currentTime per day per video to avoid double counting
            const dayVideoKey = `${activityDate}_${videoKey}`;
            if (!dailyWatchTimeMap.has(dayVideoKey)) {
              dailyWatchTimeMap.set(dayVideoKey, currentTime);
            } else {
              const existingTime = dailyWatchTimeMap.get(dayVideoKey);
              if (currentTime > existingTime) {
                dailyWatchTimeMap.set(dayVideoKey, currentTime);
              }
            }
          }
        }

        // Video started
        if (activityType === 'video_start') {
          videosStarted.add(videoKey);
        }
      });

      // Calculate totals
      let totalWatchTime = 0;
      videoWatchTimeMap.forEach((data) => {
        totalWatchTime += data.watchTime;
      });

      // Aggregate daily watch time by date
      const dailyWatchTimeAggregated = new Map();
      dailyWatchTimeMap.forEach((seconds, dayVideoKey) => {
        const date = dayVideoKey.split('_')[0]; // Extract date from key
        if (!dailyWatchTimeAggregated.has(date)) {
          dailyWatchTimeAggregated.set(date, 0);
        }
        dailyWatchTimeAggregated.set(date, dailyWatchTimeAggregated.get(date) + seconds);
      });

      // Convert daily watch time map to array
      const dailyWatchTime = Array.from(dailyWatchTimeAggregated.entries())
        .map(([date, seconds]) => ({
          date,
          seconds,
          minutes: Math.round(seconds / 60 * 100) / 100,
          hours: Math.round((seconds / 3600) * 100) / 100,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first

      return {
        studentId: student.id,
        email: student.email,
        fullName: student.full_name,
        phone: student.phone,
        domainId: student.domain_id,
        domainName: student.domain_name,
        videosWatched: videosCompleted.size,
        videosStarted: videosStarted.size,
        totalWatchTimeSeconds: totalWatchTime,
        totalWatchTimeMinutes: Math.round(totalWatchTime / 60 * 100) / 100,
        totalWatchTimeHours: Math.round((totalWatchTime / 3600) * 100) / 100,
        dailyWatchTime: dailyWatchTime,
        createdAt: student.created_at,
        updatedAt: student.updated_at,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Student analytics retrieved successfully',
      analytics: analytics,
      totalStudents: analytics.length,
    });
  } catch (error) {
    console.error('Error getting student analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getStudentAnalytics,
};

