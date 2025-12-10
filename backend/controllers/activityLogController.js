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

    // Get all video activity logs (include both uppercase and lowercase variants)
    // We need to process them to find videos in progress
    const allActivityLogs = await prisma.studentActivityLog.findMany({
      where: {
        studentId: student.id,
        activityType: {
          in: [
            'VIDEO_PLAY', 'VIDEO_WATCH', 'VIDEO_START', 'VIDEO_PAUSE', 'VIDEO_COMPLETE',
            'video_start', 'video_complete', 'video_progress', 'video_play', 'video_watch', 'video_pause'
          ],
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100, // Get more to filter properly
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

    // Group activities by video to determine progress and completion status
    const videoMap = new Map();
    
    allActivityLogs.forEach((log) => {
      const metadata = log.metadata || {};
      const videoId = metadata.videoId || metadata.video_id || null;
      const youtubeUrl = metadata.youtubeUrl || metadata.youtube_url || null;
      
      if (!videoId && !youtubeUrl) return; // Skip if no video identifier
      
      // Use YouTube URL or videoId as key
      const key = youtubeUrl || `video_${videoId}`;
      const activityType = log.activityType.toLowerCase();
      
      if (!videoMap.has(key)) {
        videoMap.set(key, {
          videoId: videoId,
          youtubeUrl: youtubeUrl,
          videoTitle: metadata.videoTitle || metadata.video_title || 'Unknown Video',
          playlistId: metadata.playlistId || metadata.playlist_id || null,
          playlistTitle: metadata.playlistTitle || metadata.playlist_title || null,
          maxProgress: 0,
          isCompleted: false,
          latestTimestamp: log.timestamp,
          latestActivityLogId: log.id,
        });
      }
      
      const videoData = videoMap.get(key);
      
      // Update latest timestamp
      if (new Date(log.timestamp) > new Date(videoData.latestTimestamp)) {
        videoData.latestTimestamp = log.timestamp;
        videoData.latestActivityLogId = log.id;
      }
      
      // Check if video is completed (already lowercase from line 131)
      if (activityType === 'video_complete') {
        videoData.isCompleted = true;
        videoData.maxProgress = 100;
      }
      
      // Update progress from progress milestones
      if (activityType === 'video_progress' && metadata.progress) {
        const progress = parseInt(metadata.progress) || 0;
        if (progress > videoData.maxProgress) {
          videoData.maxProgress = progress;
        }
      }
    });
    
    // Filter to only videos in progress (not completed and have some progress)
    const inProgressVideos = Array.from(videoMap.values())
      .filter(video => !video.isCompleted && video.maxProgress > 0 && video.maxProgress < 100)
      .sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp))
      .slice(0, 5); // Get top 5 most recent
    
    // Extract video information
    const videos = inProgressVideos.map((videoData) => {
      // Construct YouTube URL from videoId if URL is missing
      let finalYoutubeUrl = videoData.youtubeUrl;
      if (!finalYoutubeUrl && videoData.videoId) {
        finalYoutubeUrl = `https://www.youtube.com/watch?v=${videoData.videoId}`;
      }
      
      return {
        id: videoData.latestActivityLogId,
        videoId: videoData.videoId,
        videoTitle: videoData.videoTitle,
        playlistId: videoData.playlistId,
        playlistTitle: videoData.playlistTitle,
        youtubeUrl: finalYoutubeUrl,
        timestamp: videoData.latestTimestamp,
        activityType: 'video_progress',
        progress: videoData.maxProgress,
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
 * Get latest video progress for a specific video (Student)
 * GET /api/activity/video/progress?videoId=xxx&youtubeUrl=xxx
 */
const getVideoProgress = async (req, res) => {
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

    const { videoId, youtubeUrl } = req.query;

    if (!videoId && !youtubeUrl) {
      return res.status(400).json({
        success: false,
        message: 'videoId or youtubeUrl is required',
      });
    }

    // Fetch all video_progress activities and filter in JavaScript
    // (Prisma JSON queries are limited, so we filter after fetching)
    const allActivityLogs = await prisma.studentActivityLog.findMany({
      where: {
        studentId: student.id,
        activityType: {
          in: ['video_progress', 'VIDEO_PROGRESS'],
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100, // Get recent logs to search through
    });

    // Filter logs to find the one matching this video
    const matchingLogs = allActivityLogs.filter((log) => {
      const metadata = log.metadata || {};
      const logVideoId = metadata.videoId || metadata.video_id || null;
      const logYoutubeUrl = metadata.youtubeUrl || metadata.youtube_url || null;
      
      // Match by videoId or youtubeUrl
      if (videoId && logVideoId === videoId) return true;
      if (youtubeUrl && logYoutubeUrl === youtubeUrl) return true;
      
      return false;
    });

    if (matchingLogs.length === 0) {
      return res.status(200).json({
        success: true,
        progress: null,
        currentTime: 0,
        message: 'No progress found for this video',
      });
    }

    // Get the latest matching log
    const latestLog = matchingLogs[0];
    const metadata = latestLog.metadata || {};
    const currentTime = metadata.currentTime || metadata.current_time || 0;
    const progress = metadata.progress || 0;

    res.status(200).json({
      success: true,
      progress: progress,
      currentTime: currentTime,
      duration: metadata.duration || null,
      timestamp: latestLog.timestamp,
    });
  } catch (error) {
    console.error('Error in getVideoProgress:', error);
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
    
    // Track watch time per video to avoid double counting
    // Key: videoId or youtubeUrl, Value: { completed: boolean, watchTime: number, duration: number }
    const videoWatchTimeMap = new Map();
    
    // First pass: collect all video activities and track watch time
    allActivities.forEach((activity) => {
      const metadata = activity.metadata || {};
      const activityType = activity.activityType.toLowerCase();
      
      // Only process video-related activities
      if (!activityType.includes('video')) return;
      
      const videoId = metadata.videoId || metadata.video_id || null;
      const youtubeUrl = metadata.youtubeUrl || metadata.youtube_url || null;
      
      // Skip if no video identifier
      if (!videoId && !youtubeUrl) return;
      
      const videoKey = youtubeUrl || `video_${videoId}`;
      
      // Initialize video entry if not exists
      if (!videoWatchTimeMap.has(videoKey)) {
        videoWatchTimeMap.set(videoKey, {
          completed: false,
          watchTime: 0, // Actual time watched in seconds
          duration: 0, // Total video duration
          videoId: videoId,
          youtubeUrl: youtubeUrl,
          videoTitle: metadata.videoTitle || metadata.video_title || 'Unknown Video',
          playlistId: metadata.playlistId || metadata.playlist_id || null,
          playlistTitle: metadata.playlistTitle || metadata.playlist_title || null,
          latestTimestamp: activity.timestamp,
          latestActivityId: activity.id,
        });
      }
      
      const videoData = videoWatchTimeMap.get(videoKey);
      
      // Update latest timestamp
      if (new Date(activity.timestamp) > new Date(videoData.latestTimestamp)) {
        videoData.latestTimestamp = activity.timestamp;
        videoData.latestActivityId = activity.id;
      }
      
      // Video completed - use full duration
      if (activityType === 'video_complete') {
        videoData.completed = true;
        const duration = metadata.duration || 0;
        if (duration > 0) {
          videoData.duration = duration;
          videoData.watchTime = duration; // Completed = full duration
        }
      }
      
      // Video progress - track actual currentTime watched
      if (activityType === 'video_progress') {
        const currentTime = metadata.currentTime || metadata.current_time || 0;
        const duration = metadata.duration || 0;
        
        // Update duration if available
        if (duration > 0) {
          videoData.duration = duration;
        }
        
        // Update watch time to the maximum currentTime (most watched)
        if (currentTime > 0 && currentTime > videoData.watchTime) {
          videoData.watchTime = currentTime;
        }
      }
    });
    
    // Second pass: build videosWatched list and calculate total time
    let totalTimeSpent = 0; // in seconds
    
    videoWatchTimeMap.forEach((videoData, videoKey) => {
      // Only include completed videos in the watched list
      if (videoData.completed) {
        videosWatched.push({
          id: videoData.latestActivityId,
          videoId: videoData.videoId,
          videoTitle: videoData.videoTitle,
          playlistId: videoData.playlistId,
          playlistTitle: videoData.playlistTitle,
          youtubeUrl: videoData.youtubeUrl,
          timestamp: videoData.latestTimestamp,
          activityType: 'video_complete',
          progress: 100,
          duration: videoData.duration,
        });
      }
      
      // Add watch time to total (for both completed and partial watches)
      if (videoData.watchTime > 0) {
        totalTimeSpent += videoData.watchTime;
      }
    });

    // Process other activities
    allActivities.forEach((activity) => {
      const metadata = activity.metadata || {};
      const activityType = activity.activityType;

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
    // For unique videos, use videoId if available, otherwise use youtubeUrl
    const uniqueVideosWatched = new Set(
      videosWatched
        .filter(v => v.videoId || v.youtubeUrl)
        .map(v => v.videoId || v.youtubeUrl)
    ).size;
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
  getVideoProgress,
  getActivitySummary,
};

