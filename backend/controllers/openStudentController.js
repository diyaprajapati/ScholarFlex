const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { OpenStudent, OpenSession } = require('../models/OpenStudent');

/**
 * Register a new open student
 * POST /api/open/register
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, name, phone } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Normalize optional fields (convert empty strings to null)
    const normalizedName = name && name.trim() ? name.trim() : null;
    const normalizedPhone = phone && phone.trim() ? phone.trim() : null;

    // Check if email already exists in Student table (intern)
    const existingIntern = await prisma.student.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingIntern) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered as an intern. Please login instead.',
      });
    }

    // Create or get open student
    let openStudent = await OpenStudent.findByEmail(email);

    if (!openStudent) {
      openStudent = await OpenStudent.create({
        email,
        name: normalizedName,
        phone: normalizedPhone
      });
    } else if (!openStudent.isActive) {
      // Reactivate if previously soft-deleted
      openStudent = await prisma.openStudent.update({
        where: { id: openStudent.id },
        data: {
          isActive: true,
          deletedAt: null,
          lastAccessAt: new Date(),
        },
      });
    } else {
      // Update last access
      openStudent = await OpenStudent.updateLastAccess(openStudent.id);
    }

    // Create or get active session
    let session = await prisma.openSession.findFirst({
      where: {
        openStudentId: openStudent.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      session = await OpenSession.create(openStudent.id);
    } else {
      // Update last used
      session = await OpenSession.updateLastUsed(session.token);
    }

    res.status(200).json({
      success: true,
      message: 'Registration successful',
      token: session.token,
      student: {
        id: openStudent.id,
        email: openStudent.email,
        name: openStudent.name,
        phone: openStudent.phone,
      },
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get current open student (from session token)
 * GET /api/open/me
 */
const getCurrentStudent = async (req, res) => {
  try {
    const openStudent = req.openStudent;

    res.status(200).json({
      success: true,
      student: {
        id: openStudent.id,
        email: openStudent.email,
        name: openStudent.name,
        phone: openStudent.phone,
        lastAccessAt: openStudent.lastAccessAt,
      },
    });
  } catch (error) {
    console.error('Error in getCurrentStudent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get dashboard data (limited for open students)
 * GET /api/open/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const openStudent = req.openStudent;

    // Get continue watching (incomplete videos)
    // CRITICAL: Exclude completed videos and videos with 100% progress
    const continueWatching = await prisma.openVideoProgress.findMany({
      where: {
        openStudentId: openStudent.id,
        isCompleted: false,
        progressPercent: {
          lt: 100, // Explicitly exclude videos with 100% progress
        },
      },
      include: {
        video: {
          include: {
            playlist: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Get all completed videos to find next videos in playlists
    const completedVideos = await prisma.openVideoProgress.findMany({
      where: {
        openStudentId: openStudent.id,
        OR: [
          { isCompleted: true },
          { progressPercent: { gte: 100 } },
        ],
      },
      include: {
        video: {
          include: {
            playlist: {
              include: {
                videos: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Find next videos from playlists where a video was completed
    const nextVideosToAdd = [];
    const existingVideoIds = new Set(continueWatching.map(v => v.video?.id).filter(id => id != null));
    const existingVideoUrls = new Set(continueWatching.map(v => v.video?.youtubeUrl).filter(url => url));

    for (const completedProgress of completedVideos) {
      try {
        if (!completedProgress.video?.playlist) continue;
        
        const playlist = completedProgress.video.playlist;
        const completedVideo = completedProgress.video;
        
        // Find the index of the completed video in the playlist
        const completedIndex = playlist.videos.findIndex(v => v.id === completedVideo.id);
        if (completedIndex < 0 || completedIndex >= playlist.videos.length - 1) {
          continue; // No next video
        }
        
        // Get the next video
        const nextVideo = playlist.videos[completedIndex + 1];
        if (!nextVideo) continue;
        
        // Skip if next video is already in continue watching
        if (existingVideoIds.has(nextVideo.id) || existingVideoUrls.has(nextVideo.youtubeUrl)) {
          continue;
        }
        
        // Check if next video is completed
        const nextVideoProgress = await prisma.openVideoProgress.findUnique({
          where: {
            openStudentId_videoId: {
              openStudentId: openStudent.id,
              videoId: nextVideo.id,
            },
          },
        });
        
        if (nextVideoProgress && (nextVideoProgress.isCompleted || Number(nextVideoProgress.progressPercent) >= 100)) {
          continue; // Next video is also completed
        }
        
        // Add next video to continue watching (not started yet, but next in playlist)
        nextVideosToAdd.push({
          id: nextVideo.id,
          videoId: nextVideo.id,
          videoTitle: nextVideo.title,
          playlistId: playlist.id,
          playlistTitle: playlist.title,
          youtubeUrl: nextVideo.youtubeUrl,
          progress: 0,
          progressPercent: 0,
          lastPosition: 0,
          watchTimeSeconds: 0,
        });
        
        // console.log(`[Open Student Continue Watching] Adding next video "${nextVideo.title}" from playlist "${playlist.title}"`);
      } catch (err) {
        console.error(`Error finding next video for completed video ${completedProgress.videoId}:`, err);
        // Continue with next completed video
      }
    }

    // Format continue watching
    const formattedVideos = continueWatching.map((progress) => {
      // Convert Prisma Decimal to number properly
      const progressPercent = progress.progressPercent
        ? (typeof progress.progressPercent === 'object' && progress.progressPercent.toNumber
          ? progress.progressPercent.toNumber()
          : Number(progress.progressPercent))
        : 0;

      const lastPosition = progress.lastPosition
        ? (typeof progress.lastPosition === 'object' && progress.lastPosition.toNumber
          ? progress.lastPosition.toNumber()
          : Number(progress.lastPosition))
        : 0;

      // console.log('Formatting continue watching video:', {
      //   videoId: progress.video.id,
      //   videoTitle: progress.video.title,
      //   rawProgressPercent: progress.progressPercent,
      //   formattedProgress: progressPercent,
      //   rawLastPosition: progress.lastPosition,
      //   formattedLastPosition: lastPosition,
      // });

      return {
        // Match shape expected by DashboardTab for continueWatching cards
        id: progress.video.id,
        videoId: progress.video.id,
        videoTitle: progress.video.title,
        youtubeUrl: progress.video.youtubeUrl,
        playlistId: progress.playlistId,
        playlistTitle: progress.video.playlist?.title || null,
        // Use a generic "progress" field for percentage (0–100)
        progress: progressPercent,
        progressPercent: progressPercent, // Also include for compatibility
        lastPosition: lastPosition,
        watchTimeSeconds: progress.watchTimeSeconds,
        updatedAt: progress.updatedAt, // Include for sorting
      };
    });

    // Format next videos and add to continue watching
    const formattedNextVideos = nextVideosToAdd.map((video) => ({
      id: video.id,
      videoId: video.videoId,
      videoTitle: video.videoTitle,
      youtubeUrl: video.youtubeUrl,
      playlistId: video.playlistId,
      playlistTitle: video.playlistTitle,
      progress: video.progress,
      progressPercent: video.progressPercent,
      lastPosition: video.lastPosition,
      watchTimeSeconds: video.watchTimeSeconds,
    }));

    // Combine and sort by most recent (in-progress videos first, then next videos)
    const allContinueWatching = [...formattedVideos, ...formattedNextVideos]
      .sort((a, b) => {
        // Sort by updatedAt if available (in-progress videos), otherwise by video ID (next videos)
        // In-progress videos have updatedAt, next videos don't - prioritize in-progress
        if (a.updatedAt && !b.updatedAt) return -1;
        if (!a.updatedAt && b.updatedAt) return 1;
        if (a.updatedAt && b.updatedAt) {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        }
        // Both are next videos, sort by video ID (newer videos first)
        return (b.videoId || 0) - (a.videoId || 0);
      })
      .slice(0, 10); // Get top 10

    // console.log(`[Open Student Continue Watching] Returning ${allContinueWatching.length} videos (${formattedVideos.length} in-progress + ${formattedNextVideos.length} next videos)`);

    res.status(200).json({
      success: true,
      dashboard: {
        continueWatching: allContinueWatching,
        // No recommendations, no analytics, no personalization
      },
    });
  } catch (error) {
    console.error('Error in getDashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all playlists (public access)
 * GET /api/open/playlists
 */
const getPlaylists = async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
        videos: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            youtubeUrl: true,
            orderIndex: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedPlaylists = playlists.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      domain: {
        id: playlist.domain.id,
        name: playlist.domain.domainName,
        code: playlist.domain.domainCode,
      },
      videoCount: playlist._count.videos,
      videos: playlist.videos,
      createdAt: playlist.createdAt,
    }));

    res.status(200).json({
      success: true,
      playlists: formattedPlaylists,
    });
  } catch (error) {
    console.error('Error in getPlaylists:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get playlist details
 * GET /api/open/playlists/:id
 */
const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const openStudent = req.openStudent;

    const playlist = await prisma.playlist.findUnique({
      where: { id: parseInt(id) },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
        videos: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            youtubeUrl: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found',
      });
    }

    // Track playlist access
    await prisma.openPlaylistAccess.upsert({
      where: {
        openStudentId_playlistId: {
          openStudentId: openStudent.id,
          playlistId: parseInt(id),
        },
      },
      create: {
        openStudentId: openStudent.id,
        playlistId: parseInt(id),
      },
      update: {
        openedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      playlist: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        domain: {
          id: playlist.domain.id,
          name: playlist.domain.domainName,
          code: playlist.domain.domainCode,
        },
        videos: playlist.videos,
        createdAt: playlist.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in getPlaylistById:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Track video progress
 * POST /api/open/video-progress
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
    const openStudent = req.openStudent;

    // Validate video exists
    const video = await prisma.video.findUnique({
      where: { id: parseInt(videoId) },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Get existing progress to check completion status
    const existingProgress = await prisma.openVideoProgress.findUnique({
      where: {
        openStudentId_videoId: {
          openStudentId: openStudent.id,
          videoId: parseInt(videoId),
        },
      },
    });

    const shouldBeCompleted = parseFloat(progressPercent) >= 90;
    const wasCompleted = existingProgress?.isCompleted || false;
    const finalLastPosition = parseFloat(lastPosition) || 0;
    
    // If video is already completed, preserve the completion lastPosition (don't overwrite with lower values)
    let preservedLastPosition = finalLastPosition;
    if (wasCompleted && existingProgress?.lastPosition) {
      const existingLastPosition = typeof existingProgress.lastPosition === 'object' && existingProgress.lastPosition.toNumber
        ? existingProgress.lastPosition.toNumber()
        : Number(existingProgress.lastPosition);
      // Only update if new position is higher (shouldn't happen for completed videos, but safety check)
      preservedLastPosition = Math.max(existingLastPosition, finalLastPosition);
    }

    // Update or create progress
    // Handle unique constraint violations (race conditions from concurrent requests)
    let progress;
    try {
      progress = await prisma.openVideoProgress.upsert({
        where: {
          openStudentId_videoId: {
            openStudentId: openStudent.id,
            videoId: parseInt(videoId),
          },
        },
        create: {
          openStudentId: openStudent.id,
          videoId: parseInt(videoId),
          playlistId: playlistId ? parseInt(playlistId) : video.playlistId,
          watchTimeSeconds: parseInt(watchTimeSeconds) || 0,
          progressPercent: parseFloat(progressPercent) || 0,
          lastPosition: preservedLastPosition,
          openedAt: new Date(),
          startedWatching: new Date(),
          isCompleted: shouldBeCompleted,
          // Note: OpenVideoProgress model doesn't have completedAt field
        },
        update: {
          watchTimeSeconds: parseInt(watchTimeSeconds) || 0,
          progressPercent: parseFloat(progressPercent) || 0,
          lastPosition: preservedLastPosition,
          // Mark as completed if progress >= 90%, but preserve completion status once set
          isCompleted: shouldBeCompleted || wasCompleted,
          // Note: OpenVideoProgress model doesn't have completedAt field
        },
      });
    } catch (error) {
      // Handle unique constraint violation (race condition)
      // If create fails due to unique constraint, try to update instead
      if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
        // console.log(`[Open Student] Race condition detected, retrying as update for video ${videoId}`);
        // Record was created by another concurrent request, just update it
        progress = await prisma.openVideoProgress.update({
          where: {
            openStudentId_videoId: {
              openStudentId: openStudent.id,
              videoId: parseInt(videoId),
            },
          },
          data: {
            watchTimeSeconds: parseInt(watchTimeSeconds) || 0,
            progressPercent: parseFloat(progressPercent) || 0,
            lastPosition: preservedLastPosition,
            isCompleted: shouldBeCompleted || wasCompleted,
          },
        });
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Update last access
    await OpenStudent.updateLastAccess(openStudent.id);

    res.status(200).json({
      success: true,
      progress: {
        videoId: progress.videoId,
        progressPercent: Number(progress.progressPercent),
        lastPosition: Number(progress.lastPosition),
        watchTimeSeconds: progress.watchTimeSeconds,
        isCompleted: progress.isCompleted,
      },
    });
  } catch (error) {
    console.error('Error in trackVideoProgress:', error);
    
    // Unique constraint violations are already handled in the inner try-catch
    // This outer catch handles any other unexpected errors
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get video progress
 * GET /api/open/video-progress/:videoId
 */
const getVideoProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const openStudent = req.openStudent;

    const progress = await prisma.openVideoProgress.findUnique({
      where: {
        openStudentId_videoId: {
          openStudentId: openStudent.id,
          videoId: parseInt(videoId),
        },
      },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            youtubeUrl: true,
          },
        },
      },
    });

    if (!progress) {
      return res.status(200).json({
        success: true,
        progress: null,
      });
    }

    res.status(200).json({
      success: true,
      progress: {
        videoId: progress.videoId,
        progressPercent: Number(progress.progressPercent),
        lastPosition: Number(progress.lastPosition),
        watchTimeSeconds: progress.watchTimeSeconds,
        isCompleted: progress.isCompleted,
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

/**
 * Logout (delete session)
 * POST /api/open/logout
 */
const logout = async (req, res) => {
  try {
    const token = req.headers['x-open-session-token'];

    if (token) {
      await OpenSession.delete(token);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  register,
  getCurrentStudent,
  getDashboard,
  getPlaylists,
  getPlaylistById,
  trackVideoProgress,
  getVideoProgress,
  logout,
};

