const { prisma } = require('../config/database');

/**
 * Get student's own video analytics
 * GET /api/video-analytics/student
 */
const getStudentVideoAnalytics = async (req, res) => {
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

    // Get all video progress for this student
    const videoProgresses = await prisma.videoProgress.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        video: {
          include: {
            playlist: {
              select: {
                id: true,
                title: true,
                domain: {
                  select: {
                    id: true,
                    domainName: true,
                    domainCode: true,
                  },
                },
              },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            startedAt: true,
            watchTimeSeconds: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Calculate statistics
    const totalVideosOpened = videoProgresses.length;
    const totalVideosWatched = videoProgresses.filter(vp => vp.startedWatching !== null).length;
    const totalVideosCompleted = videoProgresses.filter(vp => vp.isCompleted).length;
    const totalWatchTimeSeconds = videoProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0);
    const totalWatchTimeMinutes = Math.round((totalWatchTimeSeconds / 60) * 100) / 100;
    const totalWatchTimeHours = Math.round((totalWatchTimeSeconds / 3600) * 100) / 100;

    // Group by playlist
    const playlistStats = new Map();
    videoProgresses.forEach(vp => {
      const playlistId = vp.playlistId;
      if (!playlistStats.has(playlistId)) {
        playlistStats.set(playlistId, {
          playlistId: playlistId,
          playlistTitle: vp.video.playlist.title,
          domain: vp.video.playlist.domain,
          videosOpened: 0,
          videosWatched: 0,
          videosCompleted: 0,
          totalWatchTimeSeconds: 0,
          videos: [],
        });
      }
      const stats = playlistStats.get(playlistId);
      stats.videosOpened++;
      if (vp.startedWatching) stats.videosWatched++;
      if (vp.isCompleted) stats.videosCompleted++;
      stats.totalWatchTimeSeconds += vp.watchTimeSeconds;
      stats.videos.push({
        videoId: vp.videoId,
        videoTitle: vp.video.title,
        youtubeUrl: vp.video.youtubeUrl,
        openedAt: vp.openedAt,
        startedWatching: vp.startedWatching,
        completedAt: vp.completedAt,
        watchTimeSeconds: vp.watchTimeSeconds,
        watchTimeMinutes: Math.round((vp.watchTimeSeconds / 60) * 100) / 100,
        progressPercent: parseFloat(vp.progressPercent),
        isCompleted: vp.isCompleted,
        lastPosition: parseFloat(vp.lastPosition),
      });
    });

    // Convert map to array
    const playlistAnalytics = Array.from(playlistStats.values()).map(stats => ({
      ...stats,
      totalWatchTimeMinutes: Math.round((stats.totalWatchTimeSeconds / 60) * 100) / 100,
      totalWatchTimeHours: Math.round((stats.totalWatchTimeSeconds / 3600) * 100) / 100,
    }));

    // Daily watch time - only today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Get today's watch time from sessions (if using enhanced tracking)
    // Otherwise, calculate from videoProgress based on startedWatching date
    let todayWatchTimeSeconds = 0;
    
    // Check if we have sessions (enhanced tracking)
    const hasSessions = videoProgresses.some(vp => vp.sessions && vp.sessions.length > 0);
    
    if (hasSessions) {
      // Use sessions for more accurate daily tracking (per-session watch time)
      videoProgresses.forEach(vp => {
        if (vp.sessions && vp.sessions.length > 0) {
          vp.sessions.forEach(session => {
            const sessionDate = new Date(session.startedAt);
            sessionDate.setHours(0, 0, 0, 0);
            const sessionDateStr = sessionDate.toISOString().split('T')[0];

            if (sessionDateStr === todayStr) {
              todayWatchTimeSeconds += session.watchTimeSeconds || 0;
            }
          });
        }
      });
    } else {
      // Fallback (no sessions data): we **cannot** reliably split total watch time by day
      // To avoid mixing previous days into today's metric, we treat today's watch time as 0
      // until enhanced session tracking is available for that student.
      todayWatchTimeSeconds = 0;
    }

    const todayWatchTime = {
      date: todayStr,
      seconds: todayWatchTimeSeconds,
      minutes: Math.round((todayWatchTimeSeconds / 60) * 100) / 100,
      hours: Math.round((todayWatchTimeSeconds / 3600) * 100) / 100,
    };

    res.status(200).json({
      success: true,
      message: 'Student video analytics retrieved successfully',
      analytics: {
        summary: {
          totalVideosOpened,
          totalVideosWatched,
          totalVideosCompleted,
          totalWatchTimeSeconds,
          totalWatchTimeMinutes,
          totalWatchTimeHours,
        },
        playlistAnalytics,
        todayWatchTime: todayWatchTime,
        recentVideos: videoProgresses.slice(0, 20).map(vp => ({
          videoId: vp.videoId,
          videoTitle: vp.video.title,
          playlistTitle: vp.video.playlist.title,
          openedAt: vp.openedAt,
          startedWatching: vp.startedWatching,
          completedAt: vp.completedAt,
          watchTimeMinutes: Math.round((vp.watchTimeSeconds / 60) * 100) / 100,
          progressPercent: parseFloat(vp.progressPercent),
          isCompleted: vp.isCompleted,
        })),
      },
    });
  } catch (error) {
    console.error('Error in getStudentVideoAnalytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get admin analytics for all students
 * GET /api/video-analytics/admin
 */
const getAdminVideoAnalytics = async (req, res) => {
  try {
    // Get all students (or filter by selected students)
    const { selectedOnly = 'true' } = req.query;
    
    const whereClause = {
      isActive: true,
      ...(selectedOnly === 'true' ? { isSelected: true } : {}),
    };

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        domain: {
          select: {
            id: true,
            domainName: true,
            domainCode: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    const studentIds = students.map(s => s.id);

    // Get all video progress for these students
    const allVideoProgresses = await prisma.videoProgress.findMany({
      where: {
        studentId: {
          in: studentIds,
        },
      },
      include: {
        video: {
          include: {
            playlist: {
              select: {
                id: true,
                title: true,
                domain: {
                  select: {
                    id: true,
                    domainName: true,
                    domainCode: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
            domain: {
              select: {
                id: true,
                domainName: true,
                domainCode: true,
              },
            },
          },
        },
      },
    });

    // Calculate overall statistics
    const totalStudents = students.length;
    const totalVideosOpened = allVideoProgresses.length;
    const totalVideosWatched = allVideoProgresses.filter(vp => vp.startedWatching !== null).length;
    const totalVideosCompleted = allVideoProgresses.filter(vp => vp.isCompleted).length;
    const totalWatchTimeSeconds = allVideoProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0);
    const totalWatchTimeMinutes = Math.round((totalWatchTimeSeconds / 60) * 100) / 100;
    const totalWatchTimeHours = Math.round((totalWatchTimeSeconds / 3600) * 100) / 100;

    // Per-student analytics
    const studentAnalytics = students.map(student => {
      const studentProgresses = allVideoProgresses.filter(vp => vp.studentId === student.id);
      const videosOpened = studentProgresses.length;
      const videosWatched = studentProgresses.filter(vp => vp.startedWatching !== null).length;
      const videosCompleted = studentProgresses.filter(vp => vp.isCompleted).length;
      const watchTimeSeconds = studentProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0);
      const watchTimeMinutes = Math.round((watchTimeSeconds / 60) * 100) / 100;
      const watchTimeHours = Math.round((watchTimeSeconds / 3600) * 100) / 100;

      return {
        studentId: student.id,
        email: student.email,
        fullName: student.fullName,
        domain: student.domain,
        videosOpened,
        videosWatched,
        videosCompleted,
        watchTimeSeconds,
        watchTimeMinutes,
        watchTimeHours,
        completionRate: videosOpened > 0 ? Math.round((videosCompleted / videosOpened) * 100 * 100) / 100 : 0,
      };
    });

    // Playlist analytics
    const playlistStats = new Map();
    allVideoProgresses.forEach(vp => {
      const playlistId = vp.playlistId;
      if (!playlistStats.has(playlistId)) {
        playlistStats.set(playlistId, {
          playlistId: playlistId,
          playlistTitle: vp.video.playlist.title,
          domain: vp.video.playlist.domain,
          totalViews: 0,
          totalCompletions: 0,
          totalWatchTimeSeconds: 0,
          uniqueStudents: new Set(),
        });
      }
      const stats = playlistStats.get(playlistId);
      stats.totalViews++;
      if (vp.isCompleted) stats.totalCompletions++;
      stats.totalWatchTimeSeconds += vp.watchTimeSeconds;
      stats.uniqueStudents.add(vp.studentId);
    });

    const playlistAnalytics = Array.from(playlistStats.values()).map(stats => ({
      playlistId: stats.playlistId,
      playlistTitle: stats.playlistTitle,
      domain: stats.domain,
      totalViews: stats.totalViews,
      totalCompletions: stats.totalCompletions,
      uniqueStudents: stats.uniqueStudents.size,
      totalWatchTimeSeconds: stats.totalWatchTimeSeconds,
      totalWatchTimeMinutes: Math.round((stats.totalWatchTimeSeconds / 60) * 100) / 100,
      totalWatchTimeHours: Math.round((stats.totalWatchTimeSeconds / 3600) * 100) / 100,
      completionRate: stats.totalViews > 0 ? Math.round((stats.totalCompletions / stats.totalViews) * 100 * 100) / 100 : 0,
    }));

    // Video analytics
    const videoStats = new Map();
    allVideoProgresses.forEach(vp => {
      const videoId = vp.videoId;
      if (!videoStats.has(videoId)) {
        videoStats.set(videoId, {
          videoId: videoId,
          videoTitle: vp.video.title,
          playlistTitle: vp.video.playlist.title,
          totalViews: 0,
          totalCompletions: 0,
          totalWatchTimeSeconds: 0,
          uniqueStudents: new Set(),
        });
      }
      const stats = videoStats.get(videoId);
      stats.totalViews++;
      if (vp.isCompleted) stats.totalCompletions++;
      stats.totalWatchTimeSeconds += vp.watchTimeSeconds;
      stats.uniqueStudents.add(vp.studentId);
    });

    const videoAnalytics = Array.from(videoStats.values())
      .map(stats => ({
        videoId: stats.videoId,
        videoTitle: stats.videoTitle,
        playlistTitle: stats.playlistTitle,
        totalViews: stats.totalViews,
        totalCompletions: stats.totalCompletions,
        uniqueStudents: stats.uniqueStudents.size,
        totalWatchTimeSeconds: stats.totalWatchTimeSeconds,
        totalWatchTimeMinutes: Math.round((stats.totalWatchTimeSeconds / 60) * 100) / 100,
        totalWatchTimeHours: Math.round((stats.totalWatchTimeSeconds / 3600) * 100) / 100,
        completionRate: stats.totalViews > 0 ? Math.round((stats.totalCompletions / stats.totalViews) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 50); // Top 50 most viewed videos

    // Today's watch time across all students
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    let todayWatchTimeSeconds = 0;
    allVideoProgresses.forEach(vp => {
      if (vp.startedWatching) {
        const watchDate = new Date(vp.startedWatching);
        watchDate.setHours(0, 0, 0, 0);
        const watchDateStr = watchDate.toISOString().split('T')[0];
        
        if (watchDateStr === todayStr) {
          todayWatchTimeSeconds += vp.watchTimeSeconds;
        }
      }
    });

    const todayWatchTime = {
      date: todayStr,
      seconds: todayWatchTimeSeconds,
      minutes: Math.round((todayWatchTimeSeconds / 60) * 100) / 100,
      hours: Math.round((todayWatchTimeSeconds / 3600) * 100) / 100,
    };

    res.status(200).json({
      success: true,
      message: 'Admin video analytics retrieved successfully',
      analytics: {
        summary: {
          totalStudents,
          totalVideosOpened,
          totalVideosWatched,
          totalVideosCompleted,
          totalWatchTimeSeconds,
          totalWatchTimeMinutes,
          totalWatchTimeHours,
          averageVideosPerStudent: totalStudents > 0 ? Math.round((totalVideosOpened / totalStudents) * 100) / 100 : 0,
          averageWatchTimePerStudent: totalStudents > 0 ? Math.round((totalWatchTimeHours / totalStudents) * 100) / 100 : 0,
        },
        studentAnalytics,
        playlistAnalytics,
        videoAnalytics,
        todayWatchTime: todayWatchTime,
      },
    });
  } catch (error) {
    console.error('Error in getAdminVideoAnalytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get detailed analytics for a specific student (Admin)
 * GET /api/video-analytics/admin/student/:studentId
 */
const getStudentDetailedAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
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
        message: 'Student not found',
      });
    }

    // Get all video progress for this student
    const videoProgresses = await prisma.videoProgress.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        video: {
          include: {
            playlist: {
              select: {
                id: true,
                title: true,
                domain: {
                  select: {
                    id: true,
                    domainName: true,
                    domainCode: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Calculate statistics
    const totalVideosOpened = videoProgresses.length;
    const totalVideosWatched = videoProgresses.filter(vp => vp.startedWatching !== null).length;
    const totalVideosCompleted = videoProgresses.filter(vp => vp.isCompleted).length;
    const totalWatchTimeSeconds = videoProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0);
    const totalWatchTimeMinutes = Math.round((totalWatchTimeSeconds / 60) * 100) / 100;
    const totalWatchTimeHours = Math.round((totalWatchTimeSeconds / 3600) * 100) / 100;

    // Group by playlist
    const playlistStats = new Map();
    videoProgresses.forEach(vp => {
      const playlistId = vp.playlistId;
      if (!playlistStats.has(playlistId)) {
        playlistStats.set(playlistId, {
          playlistId: playlistId,
          playlistTitle: vp.video.playlist.title,
          domain: vp.video.playlist.domain,
          videosOpened: 0,
          videosWatched: 0,
          videosCompleted: 0,
          totalWatchTimeSeconds: 0,
          videos: [],
        });
      }
      const stats = playlistStats.get(playlistId);
      stats.videosOpened++;
      if (vp.startedWatching) stats.videosWatched++;
      if (vp.isCompleted) stats.videosCompleted++;
      stats.totalWatchTimeSeconds += vp.watchTimeSeconds;
      stats.videos.push({
        videoId: vp.videoId,
        videoTitle: vp.video.title,
        youtubeUrl: vp.video.youtubeUrl,
        openedAt: vp.openedAt,
        startedWatching: vp.startedWatching,
        completedAt: vp.completedAt,
        watchTimeSeconds: vp.watchTimeSeconds,
        watchTimeMinutes: Math.round((vp.watchTimeSeconds / 60) * 100) / 100,
        progressPercent: parseFloat(vp.progressPercent),
        isCompleted: vp.isCompleted,
        lastPosition: parseFloat(vp.lastPosition),
      });
    });

    const playlistAnalytics = Array.from(playlistStats.values()).map(stats => ({
      ...stats,
      totalWatchTimeMinutes: Math.round((stats.totalWatchTimeSeconds / 60) * 100) / 100,
      totalWatchTimeHours: Math.round((stats.totalWatchTimeSeconds / 3600) * 100) / 100,
    }));

    res.status(200).json({
      success: true,
      message: 'Student detailed analytics retrieved successfully',
      student: {
        id: student.id,
        email: student.email,
        fullName: student.fullName,
        domain: student.domain,
      },
      analytics: {
        summary: {
          totalVideosOpened,
          totalVideosWatched,
          totalVideosCompleted,
          totalWatchTimeSeconds,
          totalWatchTimeMinutes,
          totalWatchTimeHours,
          completionRate: totalVideosOpened > 0 ? Math.round((totalVideosCompleted / totalVideosOpened) * 100 * 100) / 100 : 0,
        },
        playlistAnalytics,
        allVideos: videoProgresses.map(vp => ({
          videoId: vp.videoId,
          videoTitle: vp.video.title,
          playlistTitle: vp.video.playlist.title,
          openedAt: vp.openedAt,
          startedWatching: vp.startedWatching,
          completedAt: vp.completedAt,
          watchTimeMinutes: Math.round((vp.watchTimeSeconds / 60) * 100) / 100,
          progressPercent: parseFloat(vp.progressPercent),
          isCompleted: vp.isCompleted,
        })),
      },
    });
  } catch (error) {
    console.error('Error in getStudentDetailedAnalytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getStudentVideoAnalytics,
  getAdminVideoAnalytics,
  getStudentDetailedAnalytics,
};

