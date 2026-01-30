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
    // console.log('🔄 Attempting to fetch playlists...');
    
    // Step 1: Test connection with count
    let totalCount;
    try {
      totalCount = await prisma.playlist.count();
      // console.log(`✅ Total playlists in database: ${totalCount}`);
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
      // console.log(`✅ Fetched ${playlists.length} playlists from database`);
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
    
    // console.log(`✅ Successfully processed ${playlistsWithRelations.length} playlists`);

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

    // console.log(`✅ Returning ${playlistsWithRelations.length} playlists to client`);

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

    // Check if YouTube API key is configured
    const youtubeApiKey = process.env.YOUTUBE_DATA_API_KEY;
    if (!youtubeApiKey) {
      return res.status(500).json({
        success: false,
        message: 'YouTube Data API key is not configured. Please set YOUTUBE_DATA_API_KEY in environment variables.',
      });
    }

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
        message: 'Invalid YouTube playlist URL. Please provide a valid playlist URL with format: https://www.youtube.com/playlist?list=PLAYLIST_ID',
      });
    }

    const youtubePlaylistId = playlistIdMatch[1];

    // Fetch all videos from YouTube playlist using YouTube Data API v3
    const allVideos = [];
    let nextPageToken = null;
    let pageCount = 0;
    const maxPages = 50; // Safety limit to prevent infinite loops

    do {
      pageCount++;
      if (pageCount > maxPages) {
        console.warn(`Reached maximum page limit (${maxPages}) for playlist ${youtubePlaylistId}`);
        break;
      }

      // Build API URL
      let apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${youtubePlaylistId}&maxResults=50&key=${youtubeApiKey}`;
      if (nextPageToken) {
        apiUrl += `&pageToken=${nextPageToken}`;
      }

      // Fetch playlist items
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        // Handle API errors
        if (data.error) {
          const errorMessage = data.error.message || 'YouTube API error';
          const errorCode = data.error.code;
          
          if (errorCode === 403) {
            return res.status(403).json({
              success: false,
              message: 'YouTube API access denied. Please check your API key permissions and quota.',
              error: errorMessage,
            });
          } else if (errorCode === 404) {
            return res.status(404).json({
              success: false,
              message: 'YouTube playlist not found. Please check the playlist URL.',
              error: errorMessage,
            });
          } else {
            return res.status(400).json({
              success: false,
              message: `YouTube API error: ${errorMessage}`,
              error: errorMessage,
            });
          }
        }
        throw new Error(`YouTube API request failed: ${response.status} ${response.statusText}`);
      }

      // Extract video information
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          // Skip deleted or private videos
          if (item.snippet.title === 'Deleted video' || item.snippet.title === 'Private video') {
            continue;
          }

          const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          if (!videoId) {
            continue;
          }

          allVideos.push({
            title: item.snippet.title || 'Untitled Video',
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
            videoId: videoId,
            description: item.snippet.description || '',
            thumbnail: item.snippet.thumbnails?.default?.url || '',
            position: item.snippet.position || allVideos.length,
          });
        }
      }

      // Check for next page
      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    if (allVideos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No videos found in the YouTube playlist. The playlist might be empty, private, or inaccessible.',
      });
    }

    // Get the highest order_index for this playlist
    const lastVideo = await prisma.video.findFirst({
      where: { playlistId: parseInt(id) },
      orderBy: { orderIndex: 'desc' },
    });

    let nextOrderIndex = lastVideo ? lastVideo.orderIndex + 1 : 0;

    // Add videos to database
    const addedVideos = [];
    const skippedVideos = [];
    const videoErrors = [];

    for (const videoData of allVideos) {
      try {
        // Check if video already exists in this playlist (by YouTube URL)
        const existingVideo = await prisma.video.findFirst({
          where: {
            playlistId: parseInt(id),
            youtubeUrl: videoData.youtubeUrl,
          },
        });

        if (existingVideo) {
          skippedVideos.push({
            title: videoData.title,
            reason: 'Video already exists in playlist',
          });
          continue;
        }

        // Create video
        const video = await prisma.video.create({
          data: {
            playlistId: parseInt(id),
            title: videoData.title,
            youtubeUrl: videoData.youtubeUrl,
            orderIndex: nextOrderIndex++,
          },
        });

        addedVideos.push({
          id: video.id,
          title: video.title,
          youtubeUrl: video.youtubeUrl,
        });
      } catch (error) {
        console.error(`Error adding video "${videoData.title}":`, error);
        videoErrors.push({
          title: videoData.title,
          reason: error.message || 'Unknown error',
        });
      }
    }

    // Log the activity
    await logActivitySimple(
      req,
      'BULK_ADD_VIDEOS_TO_PLAYLIST',
      'USER',
      playlist.id,
      `${req.user.email} imported ${addedVideos.length} videos from YouTube playlist to: ${playlist.title}`
    );

    res.status(200).json({
      success: true,
      message: `Successfully imported ${addedVideos.length} video(s) from YouTube playlist`,
      data: {
        total: allVideos.length,
        added: addedVideos.length,
        skipped: skippedVideos.length,
        errors: videoErrors.length,
        details: {
          added: addedVideos,
          skipped: skippedVideos.slice(0, 10), // Limit to first 10
          errors: videoErrors.slice(0, 10), // Limit to first 10
        },
      },
    });
  } catch (error) {
    console.error('Error in addVideosFromPlaylistUrl:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Update a playlist (Admin/Super Admin)
 * PUT /api/admin/playlists/:id
 */
const updatePlaylist = async (req, res) => {
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
    const { title, description, domain } = req.body;

    // Validate playlist exists
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingPlaylist) {
      return res.status(404).json({
        success: false,
        message: 'Playlist not found',
      });
    }

    // Validate domain exists if provided
    if (domain) {
      const domainRecord = await prisma.domain.findUnique({
        where: { id: parseInt(domain) },
      });

      if (!domainRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid domain ID',
        });
      }
    }

    // Update playlist
    const playlist = await prisma.playlist.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(domain && { domainId: parseInt(domain) }),
      },
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
        _count: {
          select: {
            videos: true,
          },
        },
      },
    });

    // Log the activity
    await logActivitySimple(
      req,
      'UPDATE_PLAYLIST',
      'USER',
      playlist.id,
      `${req.user.email} updated playlist: ${playlist.title}`
    );

    res.status(200).json({
      success: true,
      message: 'Playlist updated successfully',
      playlist: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        domain: {
          id: playlist.domain.id,
          name: playlist.domain.domainName,
          code: playlist.domain.domainCode,
        },
        videoCount: playlist._count.videos,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error in updatePlaylist:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Delete a playlist (Admin/Super Admin)
 * DELETE /api/admin/playlists/:id
 */
const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            videos: true,
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

    // Delete all videos in the playlist first (cascade delete)
    await prisma.video.deleteMany({
      where: { playlistId: parseInt(id) },
    });

    // Delete playlist
    await prisma.playlist.delete({
      where: { id: parseInt(id) },
    });

    // Log the activity
    await logActivitySimple(
      req,
      'DELETE_PLAYLIST',
      'USER',
      parseInt(id),
      `${req.user.email} deleted playlist: ${playlist.title}`
    );

    res.status(200).json({
      success: true,
      message: 'Playlist deleted successfully',
    });
  } catch (error) {
    console.error('Error in deletePlaylist:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
  updatePlaylist,
  deletePlaylist,
};

