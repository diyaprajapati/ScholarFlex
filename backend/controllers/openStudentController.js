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
    const continueWatching = await prisma.openVideoProgress.findMany({
      where: {
        openStudentId: openStudent.id,
        isCompleted: false,
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
      
      console.log('Formatting continue watching video:', {
        videoId: progress.video.id,
        videoTitle: progress.video.title,
        rawProgressPercent: progress.progressPercent,
        formattedProgress: progressPercent,
        rawLastPosition: progress.lastPosition,
        formattedLastPosition: lastPosition,
      });
      
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
      };
    });

    res.status(200).json({
      success: true,
      dashboard: {
        continueWatching: formattedVideos,
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

    // Update or create progress
    const progress = await prisma.openVideoProgress.upsert({
      where: {
        openStudentId_videoId: {
          openStudentId: openStudent.id,
          videoId: parseInt(videoId),
        },
      },
      create: {
        openStudentId: openStudent.id,
        videoId: parseInt(videoId),
        playlistId: parseInt(playlistId),
        watchTimeSeconds: parseInt(watchTimeSeconds) || 0,
        progressPercent: parseFloat(progressPercent) || 0,
        lastPosition: parseFloat(lastPosition) || 0,
        openedAt: new Date(),
        startedWatching: new Date(),
        isCompleted: parseFloat(progressPercent) >= 90,
      },
      update: {
        watchTimeSeconds: parseInt(watchTimeSeconds) || 0,
        progressPercent: parseFloat(progressPercent) || 0,
        lastPosition: parseFloat(lastPosition) || 0,
        isCompleted: parseFloat(progressPercent) >= 90,
      },
    });

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

