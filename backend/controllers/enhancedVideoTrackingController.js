const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Track playlist opened
 * POST /api/video-tracking/playlist-opened
 */
const trackPlaylistOpened = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { playlistId } = req.body;

    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Record playlist access
    await prisma.playlistAccess.create({
      data: {
        studentId: student.id,
        playlistId: parseInt(playlistId),
        openedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Playlist access tracked successfully',
    });
  } catch (error) {
    console.error('Error in trackPlaylistOpened:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Start a new video viewing session
 * POST /api/video-tracking/session/start
 */
const startSession = async (req, res) => {
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
      where: { id: parseInt(videoId) },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Get or create video progress
    let videoProgress = await prisma.videoProgress.findUnique({
      where: {
        studentId_videoId: {
          studentId: student.id,
          videoId: parseInt(videoId),
        },
      },
    });

    if (!videoProgress) {
      videoProgress = await prisma.videoProgress.create({
        data: {
          studentId: student.id,
          videoId: parseInt(videoId),
          playlistId: parseInt(playlistId),
          openedAt: new Date(),
        },
      });
    } else if (!videoProgress.openedAt) {
      // Update openedAt if not set
      videoProgress = await prisma.videoProgress.update({
        where: { id: videoProgress.id },
        data: { openedAt: new Date() },
      });
    }

    // Create new session
    const sessionId = uuidv4();
    const session = await prisma.videoSession.create({
      data: {
        videoProgressId: videoProgress.id,
        sessionId: sessionId,
        startedAt: new Date(),
        userAgent: req.get('user-agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Session started successfully',
      sessionId: sessionId,
      session: {
        id: session.id,
        sessionId: session.sessionId,
        startedAt: session.startedAt,
      },
    });
  } catch (error) {
    console.error('Error in startSession:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Track an event within a session
 * POST /api/video-tracking/session/event
 */
const trackEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      sessionId,
      eventType,
      videoPosition,
      videoDuration,
      progressPercent,
      playbackRate,
      metadata,
    } = req.body;

    // Validate event type
    const validEventTypes = ['PLAY', 'PAUSE', 'RESUME', 'SEEK', 'PROGRESS', 'COMPLETE', 'EXIT', 'TAB_HIDDEN', 'TAB_VISIBLE'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`,
      });
    }

    // Find session
    const session = await prisma.videoSession.findUnique({
      where: { sessionId: sessionId },
      include: { videoProgress: true },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Validate student owns this session
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (session.videoProgress.studentId !== student.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to session',
      });
    }

    // Anti-cheating validation
    const validationError = validateEvent(session, {
      eventType,
      videoPosition: parseFloat(videoPosition),
      videoDuration: videoDuration ? parseFloat(videoDuration) : null,
      progressPercent: parseFloat(progressPercent),
      playbackRate: parseFloat(playbackRate || 1),
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Create event with server timestamp
    const event = await prisma.videoEvent.create({
      data: {
        sessionId: session.id,
        eventType: eventType,
        videoPosition: parseFloat(videoPosition),
        videoDuration: videoDuration ? parseFloat(videoDuration) : null,
        progressPercent: parseFloat(progressPercent),
        playbackRate: parseFloat(playbackRate || 1),
        metadata: metadata || {},
        timestamp: new Date(), // Server timestamp
      },
    });

    // Update session max progress
    // Convert Decimal to number for comparison
    const currentMaxProgress = parseFloat(session.maxProgress || 0);
    const newProgress = parseFloat(progressPercent);
    if (newProgress > currentMaxProgress) {
      await prisma.videoSession.update({
        where: { id: session.id },
        data: { maxProgress: newProgress },
      });
    }

    // Handle completion
    if (eventType === 'COMPLETE') {
      await prisma.videoSession.update({
        where: { id: session.id },
        data: {
          endedAt: new Date(),
          isCompleted: true,
          exitReason: 'completed',
        },
      });

      // Update video progress
      await updateVideoProgressFromSession(session.id);
    }

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully',
      event: {
        id: event.id,
        eventType: event.eventType,
        timestamp: event.timestamp,
      },
    });
  } catch (error) {
    console.error('Error in trackEvent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * End a session
 * POST /api/video-tracking/session/end
 */
const endSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { sessionId, exitReason } = req.body;

    const session = await prisma.videoSession.findUnique({
      where: { sessionId: sessionId },
      include: { videoProgress: true },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Validate student owns this session
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (session.videoProgress.studentId !== student.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to session',
      });
    }

    // Calculate watch time from events
    const watchTime = await calculateWatchTime(session.id);

    // Update session
    await prisma.videoSession.update({
      where: { id: session.id },
      data: {
        endedAt: new Date(),
        watchTimeSeconds: watchTime,
        exitReason: exitReason || 'exited',
      },
    });

    // Update video progress
    await updateVideoProgressFromSession(session.id);

    res.status(200).json({
      success: true,
      message: 'Session ended successfully',
      watchTimeSeconds: watchTime,
    });
  } catch (error) {
    console.error('Error in endSession:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Validate event for anti-cheating
 */
function validateEvent(session, event) {
  // Get recent events for validation
  // This would be done in a real implementation with proper queries

  // Validate playback rate
  if (event.playbackRate > 2.0) {
    return 'Suspicious playback rate detected';
  }

  // Validate position
  if (event.videoPosition < 0) {
    return 'Invalid video position';
  }

  if (event.videoDuration && event.videoPosition > event.videoDuration + 10) {
    return 'Video position exceeds duration';
  }

  // Validate progress
  if (event.progressPercent < 0 || event.progressPercent > 100) {
    return 'Invalid progress percentage';
  }

  return null;
}

/**
 * Calculate accurate watch time from events
 */
async function calculateWatchTime(sessionId) {
  const events = await prisma.videoEvent.findMany({
    where: { sessionId: sessionId },
    orderBy: { timestamp: 'asc' },
  });

  let watchTime = 0;
  let lastPlayTimestamp = null;
  let lastPlayPosition = 0;
  let isPlaying = false;

  for (const event of events) {
    const eventTime = new Date(event.timestamp).getTime();

    if (event.eventType === 'PLAY' || event.eventType === 'RESUME' || event.eventType === 'TAB_VISIBLE') {
      if (!isPlaying) {
        isPlaying = true;
        lastPlayTimestamp = eventTime;
        lastPlayPosition = parseFloat(event.videoPosition);
      }
    } else if (event.eventType === 'PAUSE' || event.eventType === 'EXIT' || event.eventType === 'TAB_HIDDEN') {
      if (isPlaying && lastPlayTimestamp) {
        const timeDiff = (eventTime - lastPlayTimestamp) / 1000; // Convert to seconds
        watchTime += Math.max(0, timeDiff);
        isPlaying = false;
        lastPlayTimestamp = null;
      }
    } else if (event.eventType === 'SEEK') {
      if (isPlaying && lastPlayTimestamp) {
        const newPosition = parseFloat(event.videoPosition);
        const positionDiff = newPosition - lastPlayPosition;
        
        // Only count time if seeking forward or small backward (< 5 seconds)
        if (positionDiff >= -5) {
          const timeDiff = (eventTime - lastPlayTimestamp) / 1000;
          watchTime += Math.max(0, timeDiff);
        }
        
        lastPlayTimestamp = eventTime;
        lastPlayPosition = newPosition;
      }
    } else if (event.eventType === 'COMPLETE') {
      if (isPlaying && lastPlayTimestamp) {
        const timeDiff = (eventTime - lastPlayTimestamp) / 1000;
        watchTime += Math.max(0, timeDiff);
        isPlaying = false;
      }
      break; // Session ends on completion
    }
  }

  // Handle case where session ended without explicit end event
  if (isPlaying && lastPlayTimestamp) {
    const lastEvent = events[events.length - 1];
    if (lastEvent) {
      const timeDiff = (new Date(lastEvent.timestamp).getTime() - lastPlayTimestamp) / 1000;
      watchTime += Math.max(0, timeDiff);
    }
  }

  return Math.round(watchTime);
}

/**
 * Update VideoProgress from session data
 */
async function updateVideoProgressFromSession(sessionId) {
  const session = await prisma.videoSession.findUnique({
    where: { id: sessionId },
    include: {
      videoProgress: true,
      events: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
  });

  if (!session) return;

  // Get all sessions for this video progress
  const allSessions = await prisma.videoSession.findMany({
    where: { videoProgressId: session.videoProgressId },
  });

  // Calculate totals
  const totalWatchTime = allSessions.reduce((sum, s) => sum + (s.watchTimeSeconds || 0), 0);
  // Convert Decimal to number for maxProgress
  const maxProgressValues = allSessions.map(s => parseFloat(s.maxProgress || 0));
  const maxProgress = maxProgressValues.length > 0 ? Math.max(...maxProgressValues) : 0;
  const replayCount = allSessions.length - 1; // First session is not a replay
  const isCompleted = allSessions.some(s => s.isCompleted);

  // Get latest position
  const lastEvent = session.events[0];
  const lastPosition = lastEvent ? parseFloat(lastEvent.videoPosition) : 0;

  // Update video progress
  await prisma.videoProgress.update({
    where: { id: session.videoProgressId },
    data: {
      watchTimeSeconds: totalWatchTime,
      progressPercent: maxProgress,
      lastPosition: lastPosition,
      isCompleted: isCompleted,
      replayCount: Math.max(0, replayCount),
      completedAt: isCompleted ? new Date() : null,
      startedWatching: session.videoProgress.startedWatching || session.startedAt,
    },
  });
}

module.exports = {
  trackPlaylistOpened,
  startSession,
  trackEvent,
  endSession,
};

