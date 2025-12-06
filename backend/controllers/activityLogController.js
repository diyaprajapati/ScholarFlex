const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');

/**
 * Save student activity log
 * POST /api/activity/log
 * This is the most important endpoint!
 */
const saveActivityLog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { activity_type, metadata } = req.body;

    // Get student ID from authenticated user
    // The student should be authenticated via JWT
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Create activity log
    const activityLog = await prisma.studentActivityLog.create({
      data: {
        studentId: student.id,
        activityType: activity_type,
        metadata: metadata || null,
        timestamp: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Activity log saved successfully',
      activityLog: {
        id: activityLog.id,
        studentId: activityLog.studentId,
        activityType: activityLog.activityType,
        metadata: activityLog.metadata,
        timestamp: activityLog.timestamp,
      },
    });
  } catch (error) {
    console.error('Error in saveActivityLog:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get last 5 video activity logs for continue watching (Student)
 * GET /api/activity/videos/recent
 */
const getRecentVideoActivities = async (req, res) => {
  try {
    // Get student ID from authenticated user
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Get last 5 video activity logs
    const activityLogs = await prisma.studentActivityLog.findMany({
      where: {
        studentId: student.id,
        activityType: {
          in: ['VIDEO_PLAY', 'VIDEO_WATCH', 'VIDEO_START', 'VIDEO_PAUSE', 'VIDEO_COMPLETE'],
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 5,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    // Extract video information from metadata
    const videos = activityLogs.map((log) => {
      const metadata = log.metadata || {};
      return {
        id: log.id,
        videoId: metadata.video_id || null,
        videoTitle: metadata.video_title || 'Unknown Video',
        playlistId: metadata.playlist_id || null,
        playlistTitle: metadata.playlist_title || null,
        youtubeUrl: metadata.youtube_url || null,
        timestamp: log.timestamp,
        activityType: log.activityType,
        progress: metadata.progress || 0, // Video watch progress in percentage
      };
    });

    res.status(200).json({
      success: true,
      message: 'Recent video activities retrieved successfully',
      videos,
    });
  } catch (error) {
    console.error('Error in getRecentVideoActivities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get comprehensive activity summary for student (Student)
 * GET /api/activity/summary
 */
const getActivitySummary = async (req, res) => {
  try {
    // Get student ID from authenticated user
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Get all activity logs for the student
    const allActivities = await prisma.studentActivityLog.findMany({
      where: {
        studentId: student.id,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Process activities
    const videosWatched = [];
    const testsCompleted = [];
    const playlistsOpened = [];
    let totalTimeSpent = 0; // in seconds

    allActivities.forEach((activity) => {
      const metadata = activity.metadata || {};
      const activityType = activity.activityType;

      // Videos watched
      if (activityType.includes('VIDEO') || activityType.includes('video')) {
        videosWatched.push({
          id: activity.id,
          videoId: metadata.video_id || null,
          videoTitle: metadata.video_title || 'Unknown Video',
          playlistId: metadata.playlist_id || null,
          playlistTitle: metadata.playlist_title || null,
          youtubeUrl: metadata.youtube_url || null,
          timestamp: activity.timestamp,
          activityType: activityType,
          progress: metadata.progress || 0,
          duration: metadata.duration || 0, // video duration in seconds
        });
        if (metadata.duration) {
          totalTimeSpent += metadata.duration;
        }
      }

      // Tests completed
      if (activityType.includes('TEST') || activityType.includes('test') || activityType.includes('SUBMIT')) {
        testsCompleted.push({
          id: activity.id,
          testId: metadata.test_id || null,
          testName: metadata.test_name || 'Unknown Test',
          score: metadata.score || null,
          percentage: metadata.percentage || null,
          timestamp: activity.timestamp,
          activityType: activityType,
        });
      }

      // Playlists opened
      if (activityType.includes('PLAYLIST') || activityType.includes('playlist')) {
        playlistsOpened.push({
          id: activity.id,
          playlistId: metadata.playlist_id || null,
          playlistTitle: metadata.playlist_title || null,
          timestamp: activity.timestamp,
          activityType: activityType,
        });
      }
    });

    // Calculate statistics
    const uniqueVideosWatched = new Set(videosWatched.map(v => v.videoId)).size;
    const uniquePlaylistsOpened = new Set(playlistsOpened.map(p => p.playlistId)).size;
    const averageScore = testsCompleted.length > 0
      ? testsCompleted.reduce((sum, t) => sum + (t.percentage || 0), 0) / testsCompleted.length
      : 0;

    res.status(200).json({
      success: true,
      message: 'Activity summary retrieved successfully',
      summary: {
        videosWatched: {
          total: videosWatched.length,
          unique: uniqueVideosWatched,
          list: videosWatched.slice(0, 50), // Last 50 videos
        },
        testsCompleted: {
          total: testsCompleted.length,
          averageScore: Math.round(averageScore * 100) / 100,
          list: testsCompleted.slice(0, 50), // Last 50 tests
        },
        playlistsOpened: {
          total: playlistsOpened.length,
          unique: uniquePlaylistsOpened,
          list: playlistsOpened.slice(0, 50), // Last 50 playlists
        },
        timeSpent: {
          totalSeconds: totalTimeSpent,
          totalMinutes: Math.round(totalTimeSpent / 60),
          totalHours: Math.round((totalTimeSpent / 3600) * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Error in getActivitySummary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  saveActivityLog,
  getRecentVideoActivities,
  getActivitySummary,
};

