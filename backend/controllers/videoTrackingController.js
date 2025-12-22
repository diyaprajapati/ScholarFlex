const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');

/**
 * Track video opened
 * POST /api/video-tracking/open
 */
const trackVideoOpened = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { videoId, playlistId } = req.body;

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

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { playlist: true },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Verify playlist matches
    if (video.playlistId !== playlistId) {
      return res.status(400).json({
        success: false,
        message: 'Video does not belong to the specified playlist',
      });
    }

    // Create or update video progress
    const videoProgress = await prisma.videoProgress.upsert({
      where: {
        studentId_videoId: {
          studentId: student.id,
          videoId: videoId,
        },
      },
      update: {
        openedAt: new Date(),
        playlistId: playlistId,
      },
      create: {
        studentId: student.id,
        videoId: videoId,
        playlistId: playlistId,
        openedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Video opened tracked successfully',
      videoProgress,
    });
  } catch (error) {
    console.error('Error in trackVideoOpened:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Track video started watching
 * POST /api/video-tracking/start
 */
const trackVideoStarted = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { videoId, playlistId } = req.body;

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

    // Create or update video progress
    const videoProgress = await prisma.videoProgress.upsert({
      where: {
        studentId_videoId: {
          studentId: student.id,
          videoId: videoId,
        },
      },
      update: {
        startedWatching: new Date(),
        playlistId: playlistId,
      },
      create: {
        studentId: student.id,
        videoId: videoId,
        playlistId: playlistId,
        startedWatching: new Date(),
      },
    });

    // Also create a session for daily tracking (if not already exists for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Check if there's already an active session today
    const existingSession = await prisma.videoSession.findFirst({
      where: {
        videoProgressId: videoProgress.id,
        startedAt: {
          gte: today,
          lte: todayEnd,
        },
        endedAt: null, // Active session
      },
    });

    let session = existingSession;
    if (!session) {
      // Create new session for today
      // Store the current watchTimeSeconds as baseline for calculating today's watch time
      const { v4: uuidv4 } = require('uuid');
      const baselineWatchTime = videoProgress.watchTimeSeconds || 0;
      session = await prisma.videoSession.create({
        data: {
          videoProgressId: videoProgress.id,
          sessionId: uuidv4(),
          startedAt: new Date(),
          watchTimeSeconds: 0, // Start at 0 for today's session
          userAgent: req.get('user-agent'),
          ipAddress: req.ip || req.connection.remoteAddress,
          // Store baseline in metadata (we'll use a workaround since metadata doesn't exist)
          // We'll calculate it dynamically when updating
        },
      });
      // Store baseline in a separate field or calculate dynamically
      // For now, we'll calculate the difference when updating progress
    }

    res.status(200).json({
      success: true,
      message: 'Video started tracking successfully',
      videoProgress,
      sessionId: session?.sessionId,
    });
  } catch (error) {
    console.error('Error in trackVideoStarted:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Track video progress (watch time and position)
 * POST /api/video-tracking/progress
 */
const trackVideoProgress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { videoId, playlistId, watchTimeSeconds, progressPercent, lastPosition } = req.body;

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

    // Get baseline watch time BEFORE updating (to calculate incremental time for session)
    const existingVideoProgress = await prisma.videoProgress.findUnique({
      where: {
        studentId_videoId: {
          studentId: student.id,
          videoId: videoId,
        },
      },
    });
    
    const baselineWatchTime = existingVideoProgress?.watchTimeSeconds || 0;

    // Create or update video progress
    const videoProgress = await prisma.videoProgress.upsert({
      where: {
        studentId_videoId: {
          studentId: student.id,
          videoId: videoId,
        },
      },
      update: {
        watchTimeSeconds: watchTimeSeconds || 0,
        progressPercent: progressPercent || 0,
        lastPosition: lastPosition || 0,
        playlistId: playlistId,
        startedWatching: new Date(),
      },
      create: {
        studentId: student.id,
        videoId: videoId,
        playlistId: playlistId,
        watchTimeSeconds: watchTimeSeconds || 0,
        progressPercent: progressPercent || 0,
        lastPosition: lastPosition || 0,
        startedWatching: new Date(),
      },
    });

    // Update session watch time if session exists
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const activeSession = await prisma.videoSession.findFirst({
      where: {
        videoProgressId: videoProgress.id,
        startedAt: {
          gte: today,
          lte: todayEnd,
        },
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (activeSession) {
      // The frontend sends currentTime (video position) as watchTimeSeconds
      // We need to calculate incremental watch time properly
      // Strategy: Use lastPosition as the current position, and track incremental changes
      
      // Get current session watch time
      const currentSessionWatchTime = activeSession.watchTimeSeconds || 0;
      
      // The lastPosition represents current position in video
      // For a session, we want to track the maximum position reached
      // But we need to be careful - if user seeks backward, we shouldn't decrease
      
      // Use lastPosition as the session watch time (represents how much of video was watched in this session)
      // This is an approximation - ideally we'd track actual play time, but this works for now
      const sessionWatchTime = Math.round(lastPosition || 0);
      
      // Only update if it's greater (to handle seeks backward)
      if (sessionWatchTime > currentSessionWatchTime) {
        await prisma.videoSession.update({
          where: { id: activeSession.id },
          data: {
            watchTimeSeconds: sessionWatchTime,
            maxProgress: Math.max(parseFloat(activeSession.maxProgress) || 0, progressPercent || 0),
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Video progress tracked successfully',
      videoProgress,
    });
  } catch (error) {
    console.error('Error in trackVideoProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Track video completed
 * POST /api/video-tracking/complete
 */
const trackVideoCompleted = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { videoId, playlistId, watchTimeSeconds } = req.body;

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

    // Create or update video progress
    const videoProgress = await prisma.videoProgress.upsert({
      where: {
        studentId_videoId: {
          studentId: student.id,
          videoId: videoId,
        },
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
        progressPercent: 100,
        watchTimeSeconds: watchTimeSeconds || 0,
        playlistId: playlistId,
      },
      create: {
        studentId: student.id,
        videoId: videoId,
        playlistId: playlistId,
        isCompleted: true,
        completedAt: new Date(),
        progressPercent: 100,
        watchTimeSeconds: watchTimeSeconds || 0,
        startedWatching: new Date(),
      },
    });

    // End active session for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const activeSession = await prisma.videoSession.findFirst({
      where: {
        videoProgressId: videoProgress.id,
        startedAt: {
          gte: today,
          lte: todayEnd,
        },
        endedAt: null,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (activeSession) {
      await prisma.videoSession.update({
        where: { id: activeSession.id },
        data: {
          endedAt: new Date(),
          watchTimeSeconds: watchTimeSeconds || activeSession.watchTimeSeconds,
          maxProgress: 100,
          isCompleted: true,
          exitReason: 'completed',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video completed tracked successfully',
      videoProgress,
    });
  } catch (error) {
    console.error('Error in trackVideoCompleted:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get video progress for a specific video (Student)
 * GET /api/video-tracking/progress/:videoId
 */
const getVideoProgress = async (req, res) => {
  try {
    const { videoId } = req.params;

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

    const videoProgress = await prisma.videoProgress.findUnique({
      where: {
        studentId_videoId: {
          studentId: student.id,
          videoId: parseInt(videoId),
        },
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            youtubeUrl: true,
            playlist: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!videoProgress) {
      return res.status(200).json({
        success: true,
        videoProgress: null,
        message: 'No progress found for this video',
      });
    }

    res.status(200).json({
      success: true,
      videoProgress: {
        ...videoProgress,
        watchTimeMinutes: Math.round((videoProgress.watchTimeSeconds / 60) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error in getVideoProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  trackVideoOpened,
  trackVideoStarted,
  trackVideoProgress,
  trackVideoCompleted,
  getVideoProgress,
};

