const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');
const { logActivitySimple } = require('../middleware/activityLogger');

/**
 * Create a new playlist (Admin/Super Admin)
 * POST /api/admin/playlists
 */
const createPlaylist = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { title, description, domain } = req.body;

    // Validate domain exists
    const domainRecord = await prisma.domain.findUnique({
      where: { id: parseInt(domain) },
    });

    if (!domainRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid domain ID',
      });
    }

    // Create playlist
    const playlist = await prisma.playlist.create({
      data: {
        title,
        description: description || null,
        domainId: parseInt(domain),
      },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
      },
    });

    // Log the activity
    await logActivitySimple(
      req,
      'CREATE_PLAYLIST',
      'USER',
      playlist.id,
      `${req.user.email} created playlist: ${title}`
    );

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      playlist: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        domain: {
          id: playlist.domain.id,
          name: playlist.domain.domainName,
          code: playlist.domain.domainCode,
        },
        createdAt: playlist.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in createPlaylist:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Add a video to a playlist (Admin/Super Admin)
 * POST /api/admin/playlists/:id/videos
 */
const addVideoToPlaylist = async (req, res) => {
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
    const { video_title, youtube_url } = req.body;

    // Validate playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { id: parseInt(id) },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found',
      });
    }

    // Get the highest order_index for this playlist
    const lastVideo = await prisma.video.findFirst({
      where: { playlistId: parseInt(id) },
      orderBy: { orderIndex: 'desc' },
    });

    const nextOrderIndex = lastVideo ? lastVideo.orderIndex + 1 : 0;

    // Create video
    const video = await prisma.video.create({
      data: {
        playlistId: parseInt(id),
        title: video_title,
        youtubeUrl: youtube_url,
        orderIndex: nextOrderIndex,
      },
      include: {
        playlist: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Log the activity
    await logActivitySimple(
      req,
      'ADD_VIDEO_TO_PLAYLIST',
      'USER',
      video.id,
      `${req.user.email} added video to playlist: ${playlist.title}`
    );

    res.status(201).json({
      success: true,
      message: 'Video added to playlist successfully',
      video: {
        id: video.id,
        title: video.title,
        youtubeUrl: video.youtubeUrl,
        orderIndex: video.orderIndex,
        playlistId: video.playlistId,
        playlistTitle: video.playlist.title,
        createdAt: video.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in addVideoToPlaylist:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Get all playlists (Admin/Super Admin)
 * GET /api/admin/playlists
 */
const getAllPlaylists = async (req, res) => {
  try {
    console.log('🔄 Attempting to fetch playlists...');
    
    // Step 1: Test connection with count
    let totalCount;
    try {
      totalCount = await prisma.playlist.count();
      console.log(`✅ Total playlists in database: ${totalCount}`);
    } catch (testError) {
      console.error('❌ Failed to count playlists:', testError);
      console.error('Error stack:', testError.stack);
      throw new Error(`Database connection issue: ${testError.message}`);
    }
    
    // Step 2: Fetch playlists (basic query, no relations)
    let playlists;
    try {
      playlists = await prisma.playlist.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });
      console.log(`✅ Fetched ${playlists.length} playlists from database`);
    } catch (queryError) {
      console.error('❌ Failed to fetch playlists:', queryError);
      console.error('Error name:', queryError.name);
      console.error('Error code:', queryError.code);
      console.error('Error message:', queryError.message);
      console.error('Error stack:', queryError.stack);
      throw queryError;
    }
    
    // Step 3: Fetch domains and videos for each playlist
    const playlistsWithRelations = [];
    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];
      const playlistData = {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        domainId: playlist.domainId,
        createdAt: playlist.createdAt,
        domain: null,
        videos: [],
        videoCount: 0,
      };
      
      // Fetch domain
      if (playlist.domainId) {
        try {
          const domain = await prisma.domain.findUnique({
            where: { id: playlist.domainId },
          });
          if (domain) {
            playlistData.domain = {
              id: domain.id,
              name: domain.domainName,
              code: domain.domainCode,
            };
          } else {
            console.warn(`⚠️ Domain ${playlist.domainId} not found for playlist ${playlist.id}`);
          }
        } catch (domainError) {
          console.warn(`⚠️ Error fetching domain ${playlist.domainId} for playlist ${playlist.id}:`, domainError.message);
        }
      }
      
      // Fetch videos
      try {
        const videos = await prisma.video.findMany({
          where: { playlistId: playlist.id },
          orderBy: { orderIndex: 'asc' },
        });
        playlistData.videos = videos.map(v => ({
          id: v.id,
          title: v.title,
          youtubeUrl: v.youtubeUrl,
          orderIndex: v.orderIndex,
          createdAt: v.createdAt,
        }));
        playlistData.videoCount = videos.length;
      } catch (videoError) {
        console.warn(`⚠️ Error fetching videos for playlist ${playlist.id}:`, videoError.message);
      }
      
      playlistsWithRelations.push(playlistData);
    }
    
    console.log(`✅ Successfully processed ${playlistsWithRelations.length} playlists`);

    // Log the activity (don't fail if logging fails)
    try {
      await logActivitySimple(
        req,
        'VIEW_PLAYLISTS',
        'USER',
        null,
        `${req.user.email} viewed all playlists`
      );
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Continue even if logging fails
    }

    console.log(`✅ Returning ${playlistsWithRelations.length} playlists to client`);

    res.status(200).json({
      success: true,
      playlists: playlistsWithRelations,
    });
  } catch (error) {
    console.error('❌ Error in getAllPlaylists:', error);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // If it's a Prisma error, log more details
    if (error.code) {
      console.error('Prisma error code:', error.code);
    }
    if (error.meta) {
      console.error('Prisma error meta:', JSON.stringify(error.meta, null, 2));
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        meta: error.meta,
      } : undefined,
    });
  }
};

/**
 * Get all playlists (Student)
 * GET /api/student/playlists
 */
const getStudentPlaylists = async (req, res) => {
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
          select: {
            id: true,
            title: true,
            youtubeUrl: true,
            orderIndex: true,
            createdAt: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      playlists: playlists.map((playlist) => ({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        domain: {
          id: playlist.domain.id,
          name: playlist.domain.domainName,
          code: playlist.domain.domainCode,
        },
        videoCount: playlist.videos.length,
        videos: playlist.videos,
        createdAt: playlist.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error in getStudentPlaylists:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get recommended playlists for student (based on their domain)
 * GET /api/student/playlists/recommended
 */
const getRecommendedPlaylists = async (req, res) => {
  try {
    // Get student's domain from the authenticated user
    // The student should be authenticated and we can get their domain from req.user
    // But we need to fetch the student record to get their domain
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    if (!student.domainId) {
      return res.status(200).json({
        success: true,
        message: 'Student has no domain assigned',
        playlists: [],
      });
    }

    // Get playlists matching student's domain
    const playlists = await prisma.playlist.findMany({
      where: {
        domainId: student.domainId,
      },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
        videos: {
          select: {
            id: true,
            title: true,
            youtubeUrl: true,
            orderIndex: true,
            createdAt: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      playlists: playlists.map((playlist) => ({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        domain: {
          id: playlist.domain.id,
          name: playlist.domain.domainName,
          code: playlist.domain.domainCode,
        },
        videoCount: playlist.videos.length,
        videos: playlist.videos,
        createdAt: playlist.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error in getRecommendedPlaylists:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Delete a video from a playlist (Admin/Super Admin)
 * DELETE /api/admin/playlists/:playlistId/videos/:videoId
 */
const deleteVideoFromPlaylist = async (req, res) => {
  try {
    const { playlistId, videoId } = req.params;

    // Validate playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { id: parseInt(playlistId) },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found',
      });
    }

    // Validate video exists and belongs to playlist
    const video = await prisma.video.findFirst({
      where: {
        id: parseInt(videoId),
        playlistId: parseInt(playlistId),
      },
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found in this playlist',
      });
    }

    // Delete video
    await prisma.video.delete({
      where: { id: parseInt(videoId) },
    });

    // Log the activity
    await logActivitySimple(
      req,
      'DELETE_VIDEO_FROM_PLAYLIST',
      'USER',
      video.id,
      `${req.user.email} deleted video "${video.title}" from playlist: ${playlist.title}`
    );

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteVideoFromPlaylist:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Add multiple videos from YouTube playlist URL (Admin/Super Admin)
 * POST /api/admin/playlists/:id/videos/bulk
 */
const addVideosFromPlaylistUrl = async (req, res) => {
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
    const { youtube_playlist_url } = req.body;

    // Validate playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { id: parseInt(id) },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found',
      });
    }

    // Extract playlist ID from URL
    const playlistIdMatch = youtube_playlist_url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (!playlistIdMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid YouTube playlist URL. Please provide a valid playlist URL.',
      });
    }

    // For now, return a message that this requires YouTube API
    // In production, you would use YouTube Data API v3 to fetch playlist videos
    return res.status(501).json({
      success: false,
      message: 'YouTube playlist import requires YouTube Data API integration. Please add videos individually or configure YouTube API key.',
      note: 'To enable this feature, you need to: 1) Get YouTube Data API key, 2) Install youtube-playlist-parser or use YouTube API, 3) Configure API key in environment variables',
    });
  } catch (error) {
    console.error('Error in addVideosFromPlaylistUrl:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  createPlaylist,
  addVideoToPlaylist,
  deleteVideoFromPlaylist,
  addVideosFromPlaylistUrl,
  getAllPlaylists,
  getStudentPlaylists,
  getRecommendedPlaylists,
};

