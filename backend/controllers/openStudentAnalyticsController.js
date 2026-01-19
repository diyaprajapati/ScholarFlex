const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * Get aggregate analytics for open students (Admin only)
 * GET /api/admin/analytics/open-students/aggregate
 */
const getAggregateAnalytics = async (req, res) => {
  try {
    // Get total registered open students
    const totalRegistered = await prisma.openStudent.count({
      where: {
        isActive: true,
        convertedToInternId: null,
      },
    });

    // Get active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeLast7Days = await prisma.openStudent.count({
      where: {
        isActive: true,
        convertedToInternId: null,
        lastAccessAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeLast30Days = await prisma.openStudent.count({
      where: {
        isActive: true,
        convertedToInternId: null,
        lastAccessAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get top playlists by access count
    const topPlaylists = await prisma.openPlaylistAccess.groupBy({
      by: ['playlistId'],
      _count: {
        playlistId: true,
      },
      orderBy: {
        _count: {
          playlistId: 'desc',
        },
      },
      take: 10,
    });

    // Get playlist details
    const playlistIds = topPlaylists.map((p) => p.playlistId);
    const playlists = await prisma.playlist.findMany({
      where: {
        id: { in: playlistIds },
      },
      select: {
        id: true,
        title: true,
      },
    });

    const topPlaylistsWithDetails = topPlaylists.map((item) => {
      const playlist = playlists.find((p) => p.id === item.playlistId);
      return {
        playlistId: item.playlistId,
        playlistTitle: playlist?.title || 'Unknown',
        accessCount: item._count.playlistId,
      };
    });

    // Get top videos by watch count (incomplete videos only, as per requirements)
    const topVideos = await prisma.openVideoProgress.groupBy({
      by: ['videoId'],
      where: {
        isCompleted: false, // Only incomplete videos
      },
      _count: {
        videoId: true,
      },
      _sum: {
        watchTimeSeconds: true,
      },
      orderBy: {
        _count: {
          videoId: 'desc',
        },
      },
      take: 10,
    });

    // Get video details
    const videoIds = topVideos.map((v) => v.videoId);
    const videos = await prisma.video.findMany({
      where: {
        id: { in: videoIds },
      },
      select: {
        id: true,
        title: true,
      },
    });

    const topVideosWithDetails = topVideos.map((item) => {
      const video = videos.find((v) => v.id === item.videoId);
      return {
        videoId: item.videoId,
        videoTitle: video?.title || 'Unknown',
        watchCount: item._count.videoId,
        totalWatchTime: item._sum.watchTimeSeconds || 0,
      };
    });

    // Calculate average watch time
    const allProgress = await prisma.openVideoProgress.aggregate({
      _avg: {
        watchTimeSeconds: true,
      },
      where: {
        isCompleted: false,
      },
    });

    const averageWatchTime = Math.round(allProgress._avg.watchTimeSeconds || 0);

    // Get registration trends (last 30 days)
    const registrationTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await prisma.openStudent.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          isActive: true,
          convertedToInternId: null,
        },
      });

      registrationTrends.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    res.status(200).json({
      success: true,
      analytics: {
        totalRegistered,
        activeUsers: {
          last7Days: activeLast7Days,
          last30Days: activeLast30Days,
        },
        topPlaylists: topPlaylistsWithDetails,
        topVideos: topVideosWithDetails,
        averageWatchTime,
        registrationTrends,
      },
    });
  } catch (error) {
    console.error('Error in getAggregateAnalytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get statistics for open students (Admin only)
 * GET /api/admin/analytics/open-students/stats
 */
const getStats = async (req, res) => {
  try {
    // Total registered
    const totalRegistered = await prisma.openStudent.count({
      where: {
        isActive: true,
        convertedToInternId: null,
      },
    });

    // Total converted to interns
    const totalConverted = await prisma.openStudent.count({
      where: {
        convertedToInternId: { not: null },
      },
    });

    // Total soft-deleted
    const totalSoftDeleted = await prisma.openStudent.count({
      where: {
        isActive: false,
        deletedAt: { not: null },
        convertedToInternId: null,
      },
    });

    // Total video progress records
    const totalVideoProgress = await prisma.openVideoProgress.count({
      where: {
        openStudent: {
          isActive: true,
          convertedToInternId: null,
        },
      },
    });

    // Total playlist accesses
    const totalPlaylistAccesses = await prisma.openPlaylistAccess.count({
      where: {
        openStudent: {
          isActive: true,
          convertedToInternId: null,
        },
      },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalRegistered,
        totalConverted,
        totalSoftDeleted,
        totalVideoProgress,
        totalPlaylistAccesses,
      },
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getAggregateAnalytics,
  getStats,
};

