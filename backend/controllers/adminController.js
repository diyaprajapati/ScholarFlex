const { validationResult } = require('express-validator');
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
    const role = await prisma.role.findUnique({
      where: { roleCode: role_code },
      select: { id: true },
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role code',
      });
    }

    const role_id = role.id;

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
        // Normalize is_active: MySQL returns 0/1, convert to boolean
        is_active: admin.is_active === 1 || admin.is_active === true || admin.is_active === '1',
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
    const { email, full_name, is_active, role_code } = req.body;

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
    
    // If email is provided, check if it's already taken by another user
    if (email && email !== admin.email) {
      const emailExists = await User.exists(email);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
        });
      }
      updateData.email = email;
    }
    
    // If role_code is provided, get role_id
    if (role_code) {
      const role = await prisma.role.findUnique({
        where: { roleCode: role_code },
        select: { id: true },
      });
      
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role code',
        });
      }
      
      updateData.role_id = role.id;
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
 * Delete admin (Super Admin only) - Hard delete (permanently removes from database)
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

    // Hard delete admin (permanently remove from database)
    const deleteResult = await User.delete(id);
    
    if (!deleteResult) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete admin',
      });
    }

    // Verify the admin was actually deleted (record should no longer exist)
    const verifyResult = await prisma.$queryRaw`
      SELECT id FROM users WHERE id = ${id}
    `;
    
    if (verifyResult.length > 0) {
      console.error('Admin deletion verification failed: Admin still exists in database', { id });
      return res.status(500).json({
        success: false,
        message: 'Admin deletion failed verification: Record still exists in database',
      });
    }
    
    // console.log('Admin deletion verified successfully: Record removed from database', { id });

    // Log the activity (convert id to integer for entityId)
    await logActivitySimple(
      req,
      'DELETE_ADMIN',
      'USER',
      parseInt(id),
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
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get student analytics for all selected students
 * GET /api/admin/students/analytics
 */
const getStudentAnalytics = async (req, res) => {
  try {
    // Get all selected students using Prisma
    const studentsData = await prisma.student.findMany({
      where: {
        isActive: true,
        isSelected: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        domainId: true,
        isSelected: true,
        createdAt: true,
        updatedAt: true,
        domain: {
          select: {
            domainName: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    // Transform to match expected format
    const students = studentsData.map(s => ({
      id: s.id,
      email: s.email,
      full_name: s.fullName,
      phone: s.phone,
      domain_id: s.domainId,
      domain_name: s.domain?.domainName || null,
      is_selected: s.isSelected,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    }));
    
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
      const videoWatchTimeMap = new Map(); // videoKey -> { watchTime, completed, videoTitle }
      const dailyWatchTimeMap = new Map(); // dayVideoKey (date_videoKey) -> seconds
      const dailyVideoMap = new Map(); // date -> Map<videoKey, { videoTitle, seconds }>
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
        
        // Initialize per-video map
        if (!videoWatchTimeMap.has(videoKey)) {
          videoWatchTimeMap.set(videoKey, {
            watchTime: 0,
            completed: false,
            videoTitle: metadata.videoTitle || metadata.video_title || 'Unknown Video',
          });
        }
        
        const videoData = videoWatchTimeMap.get(videoKey);
        
        // Initialize per-day structures
        const dayVideoKey = `${activityDate}_${videoKey}`;
        if (!dailyWatchTimeMap.has(dayVideoKey)) {
          dailyWatchTimeMap.set(dayVideoKey, 0);
        }
        if (!dailyVideoMap.has(activityDate)) {
          dailyVideoMap.set(activityDate, new Map());
        }
        const dayVideoMap = dailyVideoMap.get(activityDate);
        if (!dayVideoMap.has(videoKey)) {
          dayVideoMap.set(videoKey, {
            videoTitle: videoData.videoTitle,
            seconds: 0,
          });
        }
        const dayVideoData = dayVideoMap.get(videoKey);
      
        // Video completed - use full duration
        if (activityType === 'video_complete') {
          videosCompleted.add(videoKey);
          videosStarted.add(videoKey);
          videoData.completed = true;
          const duration = metadata.duration || 0;
          if (duration > 0) {
            videoData.watchTime = duration;
            // For per-day/per-video, use max duration for that day
            const existingDaySeconds = dailyWatchTimeMap.get(dayVideoKey) || 0;
            const newDaySeconds = Math.max(existingDaySeconds, duration);
            dailyWatchTimeMap.set(dayVideoKey, newDaySeconds);
            dayVideoData.seconds = Math.max(dayVideoData.seconds, duration);
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
            // For daily tracking, use the maximum currentTime per day per video
            const existingTime = dailyWatchTimeMap.get(dayVideoKey) || 0;
            if (currentTime > existingTime) {
              dailyWatchTimeMap.set(dayVideoKey, currentTime);
            }
            if (currentTime > dayVideoData.seconds) {
              dayVideoData.seconds = currentTime;
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
          minutes: Math.round((seconds / 60) * 100) / 100,
          hours: Math.round((seconds / 3600) * 100) / 100,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first
      
      // Build daily video-wise watch details: per date, which videos and how many minutes
      const dailyVideoWatch = Array.from(dailyVideoMap.entries())
        .map(([date, videosMap]) => {
          const videos = Array.from(videosMap.values()).map(v => ({
            videoTitle: v.videoTitle,
            seconds: v.seconds,
            minutes: Math.round((v.seconds / 60) * 100) / 100,
          }));
          const totalSeconds = videos.reduce((sum, v) => sum + v.seconds, 0);
          return {
            date,
            totalSeconds,
            minutes: Math.round((totalSeconds / 60) * 100) / 100,
            hours: Math.round((totalSeconds / 3600) * 100) / 100,
            videos,
          };
        })
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
        totalWatchTimeMinutes: Math.round((totalWatchTime / 60) * 100) / 100,
        totalWatchTimeHours: Math.round((totalWatchTime / 3600) * 100) / 100,
        dailyWatchTime,
        dailyVideoWatch,
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

