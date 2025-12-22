const { prisma } = require('../config/database');

/**
 * Get comprehensive student analytics
 * GET /api/video-analytics/student/detailed
 */
const getStudentDetailedAnalytics = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Get all video progress
    const videoProgresses = await prisma.videoProgress.findMany({
      where: { studentId: student.id },
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
          include: {
            events: {
              orderBy: { timestamp: 'asc' },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    // Calculate statistics
    const stats = {
      totalVideosOpened: videoProgresses.length,
      totalVideosWatched: videoProgresses.filter(vp => vp.startedWatching).length,
      totalVideosCompleted: videoProgresses.filter(vp => vp.isCompleted).length,
      totalWatchTimeSeconds: videoProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0),
      totalReplays: videoProgresses.reduce((sum, vp) => sum + vp.replayCount, 0),
    };

    // Per-playlist analytics
    const playlistMap = new Map();
    videoProgresses.forEach(vp => {
      const playlistId = vp.playlistId;
      if (!playlistMap.has(playlistId)) {
        playlistMap.set(playlistId, {
          playlistId: playlistId,
          playlistTitle: vp.video.playlist.title,
          domain: vp.video.playlist.domain,
          videosOpened: 0,
          videosWatched: 0,
          videosCompleted: 0,
          totalWatchTimeSeconds: 0,
          totalReplays: 0,
          videos: [],
        });
      }
      const playlist = playlistMap.get(playlistId);
      playlist.videosOpened++;
      if (vp.startedWatching) playlist.videosWatched++;
      if (vp.isCompleted) playlist.videosCompleted++;
      playlist.totalWatchTimeSeconds += vp.watchTimeSeconds;
      playlist.totalReplays += vp.replayCount;
      playlist.videos.push({
        videoId: vp.videoId,
        videoTitle: vp.video.title,
        openedAt: vp.openedAt,
        startedWatching: vp.startedWatching,
        completedAt: vp.completedAt,
        watchTimeSeconds: vp.watchTimeSeconds,
        progressPercent: parseFloat(vp.progressPercent),
        isCompleted: vp.isCompleted,
        replayCount: vp.replayCount,
        lastPosition: parseFloat(vp.lastPosition),
        sessionCount: vp.sessions.length,
      });
    });

    // Per-video detailed analytics
    const videoAnalytics = videoProgresses.map(vp => {
      const sessions = vp.sessions || [];
      const events = sessions.flatMap(s => s.events || []);
      
      // Calculate play/pause/resume counts
      const playCount = events.filter(e => e.eventType === 'PLAY').length;
      const pauseCount = events.filter(e => e.eventType === 'PAUSE').length;
      const resumeCount = events.filter(e => e.eventType === 'RESUME').length;
      const seekCount = events.filter(e => e.eventType === 'SEEK').length;
      
      // Find drop-off points (exits before completion)
      const exitEvents = events.filter(e => e.eventType === 'EXIT');
      const dropOffPoints = exitEvents.map(e => ({
        position: parseFloat(e.videoPosition),
        progress: parseFloat(e.progressPercent),
        timestamp: e.timestamp,
      }));

      return {
        videoId: vp.videoId,
        videoTitle: vp.video.title,
        playlistTitle: vp.video.playlist.title,
        openedAt: vp.openedAt,
        startedWatching: vp.startedWatching,
        completedAt: vp.completedAt,
        watchTimeSeconds: vp.watchTimeSeconds,
        watchTimeMinutes: Math.round((vp.watchTimeSeconds / 60) * 100) / 100,
        progressPercent: parseFloat(vp.progressPercent),
        isCompleted: vp.isCompleted,
        replayCount: vp.replayCount,
        sessionCount: sessions.length,
        playCount,
        pauseCount,
        resumeCount,
        seekCount,
        dropOffPoints,
        lastPosition: parseFloat(vp.lastPosition),
      };
    });

    // Daily watch time
    const dailyWatchTime = new Map();
    videoProgresses.forEach(vp => {
      vp.sessions.forEach(session => {
        if (session.startedAt) {
          const date = new Date(session.startedAt).toISOString().split('T')[0];
          if (!dailyWatchTime.has(date)) {
            dailyWatchTime.set(date, 0);
          }
          dailyWatchTime.set(date, dailyWatchTime.get(date) + (session.watchTimeSeconds || 0));
        }
      });
    });

    const dailyWatchTimeArray = Array.from(dailyWatchTime.entries())
      .map(([date, seconds]) => ({
        date,
        seconds,
        minutes: Math.round((seconds / 60) * 100) / 100,
        hours: Math.round((seconds / 3600) * 100) / 100,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      analytics: {
        summary: {
          ...stats,
          totalWatchTimeMinutes: Math.round((stats.totalWatchTimeSeconds / 60) * 100) / 100,
          totalWatchTimeHours: Math.round((stats.totalWatchTimeSeconds / 3600) * 100) / 100,
          completionRate: stats.totalVideosOpened > 0 
            ? Math.round((stats.totalVideosCompleted / stats.totalVideosOpened) * 100 * 100) / 100 
            : 0,
        },
        playlistAnalytics: Array.from(playlistMap.values()),
        videoAnalytics,
        dailyWatchTime: dailyWatchTimeArray,
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

/**
 * Get admin analytics with drop-off analysis
 * GET /api/video-analytics/admin/detailed
 */
const getAdminDetailedAnalytics = async (req, res) => {
  try {
    const { selectedOnly = 'true', playlistId, videoId } = req.query;

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
    });

    const studentIds = students.map(s => s.id);

    // Build video progress query
    const progressWhere = {
      studentId: { in: studentIds },
      ...(playlistId ? { playlistId: parseInt(playlistId) } : {}),
      ...(videoId ? { videoId: parseInt(videoId) } : {}),
    };

    const allVideoProgresses = await prisma.videoProgress.findMany({
      where: progressWhere,
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
        sessions: {
          include: {
            events: {
              orderBy: { timestamp: 'asc' },
            },
          },
        },
      },
    });

    // Overall statistics
    const totalStudents = students.length;
    const totalVideosOpened = allVideoProgresses.length;
    const totalVideosWatched = allVideoProgresses.filter(vp => vp.startedWatching).length;
    const totalVideosCompleted = allVideoProgresses.filter(vp => vp.isCompleted).length;
    const totalWatchTimeSeconds = allVideoProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0);
    const averageWatchTimeSeconds = totalVideosWatched > 0 ? totalWatchTimeSeconds / totalVideosWatched : 0;
    const completionRate = totalVideosOpened > 0 ? (totalVideosCompleted / totalVideosOpened) * 100 : 0;

    // Per-student analytics
    const studentAnalytics = students.map(student => {
      const studentProgresses = allVideoProgresses.filter(vp => vp.studentId === student.id);
      const videosOpened = studentProgresses.length;
      const videosWatched = studentProgresses.filter(vp => vp.startedWatching).length;
      const videosCompleted = studentProgresses.filter(vp => vp.isCompleted).length;
      const watchTimeSeconds = studentProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0);
      const averageWatchTime = videosWatched > 0 ? watchTimeSeconds / videosWatched : 0;
      const studentCompletionRate = videosOpened > 0 ? (videosCompleted / videosOpened) * 100 : 0;

      return {
        studentId: student.id,
        email: student.email,
        fullName: student.fullName,
        domain: student.domain,
        videosOpened,
        videosWatched,
        videosCompleted,
        watchTimeSeconds,
        watchTimeMinutes: Math.round((watchTimeSeconds / 60) * 100) / 100,
        watchTimeHours: Math.round((watchTimeSeconds / 3600) * 100) / 100,
        averageWatchTimeSeconds: Math.round(averageWatchTime),
        averageWatchTimeMinutes: Math.round((averageWatchTime / 60) * 100) / 100,
        completionRate: Math.round(studentCompletionRate * 100) / 100,
      };
    });

    // Per-video analytics with drop-off analysis
    const videoMap = new Map();
    allVideoProgresses.forEach(vp => {
      const videoKey = vp.videoId;
      if (!videoMap.has(videoKey)) {
        videoMap.set(videoKey, {
          videoId: videoKey,
          videoTitle: vp.video.title,
          playlistTitle: vp.video.playlist.title,
          totalViews: 0,
          totalCompletions: 0,
          totalWatchTimeSeconds: 0,
          uniqueStudents: new Set(),
          dropOffPoints: [],
          exitReasons: {},
        });
      }
      const videoData = videoMap.get(videoKey);
      videoData.totalViews++;
      if (vp.isCompleted) videoData.totalCompletions++;
      videoData.totalWatchTimeSeconds += vp.watchTimeSeconds;
      videoData.uniqueStudents.add(vp.studentId);

      // Collect drop-off points
      vp.sessions.forEach(session => {
        if (!session.isCompleted && session.exitReason) {
          const exitEvents = session.events.filter(e => e.eventType === 'EXIT');
          exitEvents.forEach(event => {
            videoData.dropOffPoints.push({
              position: parseFloat(event.videoPosition),
              progress: parseFloat(event.progressPercent),
              timestamp: event.timestamp,
            });
          });
          
          // Track exit reasons
          videoData.exitReasons[session.exitReason] = (videoData.exitReasons[session.exitReason] || 0) + 1;
        }
      });
    });

    const videoAnalytics = Array.from(videoMap.values()).map(video => {
      // Calculate drop-off timestamps (most common exit points)
      const dropOffByPosition = {};
      video.dropOffPoints.forEach(point => {
        const positionBucket = Math.floor(point.position / 30) * 30; // 30-second buckets
        dropOffByPosition[positionBucket] = (dropOffByPosition[positionBucket] || 0) + 1;
      });

      const sortedDropOffs = Object.entries(dropOffByPosition)
        .map(([position, count]) => ({ position: parseInt(position), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 drop-off points

      const averageWatchTime = video.totalViews > 0 ? video.totalWatchTimeSeconds / video.totalViews : 0;
      const completionRate = video.totalViews > 0 ? (video.totalCompletions / video.totalViews) * 100 : 0;

      return {
        videoId: video.videoId,
        videoTitle: video.videoTitle,
        playlistTitle: video.playlistTitle,
        totalViews: video.totalViews,
        totalCompletions: video.totalCompletions,
        uniqueStudents: video.uniqueStudents.size,
        totalWatchTimeSeconds: video.totalWatchTimeSeconds,
        totalWatchTimeMinutes: Math.round((video.totalWatchTimeSeconds / 60) * 100) / 100,
        totalWatchTimeHours: Math.round((video.totalWatchTimeSeconds / 3600) * 100) / 100,
        averageWatchTimeSeconds: Math.round(averageWatchTime),
        averageWatchTimeMinutes: Math.round((averageWatchTime / 60) * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        dropOffTimestamps: sortedDropOffs,
        exitReasons: video.exitReasons,
      };
    }).sort((a, b) => b.totalViews - a.totalViews);

    // Most/Least watched videos
    const mostWatchedVideos = [...videoAnalytics]
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);
    
    const leastWatchedVideos = [...videoAnalytics]
      .filter(v => v.totalViews > 0)
      .sort((a, b) => a.totalViews - b.totalViews)
      .slice(0, 10);

    // Students who didn't complete required videos
    // (Assuming videos in playlists are "required")
    const incompleteStudents = studentAnalytics
      .filter(s => s.completionRate < 100)
      .sort((a, b) => a.completionRate - b.completionRate);

    res.status(200).json({
      success: true,
      analytics: {
        summary: {
          totalStudents,
          totalVideosOpened,
          totalVideosWatched,
          totalVideosCompleted,
          totalWatchTimeSeconds,
          totalWatchTimeMinutes: Math.round((totalWatchTimeSeconds / 60) * 100) / 100,
          totalWatchTimeHours: Math.round((totalWatchTimeSeconds / 3600) * 100) / 100,
          averageWatchTimeSeconds: Math.round(averageWatchTimeSeconds),
          averageWatchTimeMinutes: Math.round((averageWatchTimeSeconds / 60) * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100,
        },
        studentAnalytics,
        videoAnalytics,
        mostWatchedVideos,
        leastWatchedVideos,
        incompleteStudents: incompleteStudents.slice(0, 20), // Top 20
      },
    });
  } catch (error) {
    console.error('Error in getAdminDetailedAnalytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get analytics for specific video
 * GET /api/video-analytics/admin/video/:videoId
 */
const getVideoAnalytics = async (req, res) => {
  try {
    const { videoId } = req.params;

    const videoProgresses = await prisma.videoProgress.findMany({
      where: { videoId: parseInt(videoId) },
      include: {
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
        sessions: {
          include: {
            events: {
              orderBy: { timestamp: 'asc' },
            },
          },
        },
      },
    });

    if (videoProgresses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No analytics data found for this video',
      });
    }

    const video = await prisma.video.findUnique({
      where: { id: parseInt(videoId) },
      include: {
        playlist: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Calculate drop-off timestamps
    const allDropOffPoints = [];
    videoProgresses.forEach(vp => {
      vp.sessions.forEach(session => {
        if (!session.isCompleted) {
          const exitEvents = session.events.filter(e => e.eventType === 'EXIT');
          exitEvents.forEach(event => {
            allDropOffPoints.push({
              position: parseFloat(event.videoPosition),
              progress: parseFloat(event.progressPercent),
              timestamp: event.timestamp,
              studentId: vp.studentId,
              studentName: vp.student.fullName,
            });
          });
        }
      });
    });

    // Group by position buckets
    const dropOffByPosition = {};
    allDropOffPoints.forEach(point => {
      const bucket = Math.floor(point.position / 30) * 30; // 30-second buckets
      if (!dropOffByPosition[bucket]) {
        dropOffByPosition[bucket] = [];
      }
      dropOffByPosition[bucket].push(point);
    });

    const dropOffTimestamps = Object.entries(dropOffByPosition)
      .map(([position, points]) => ({
        position: parseInt(position),
        count: points.length,
        students: points.map(p => ({
          studentId: p.studentId,
          studentName: p.studentName,
          progress: p.progress,
        })),
      }))
      .sort((a, b) => b.count - a.count);

    const totalViews = videoProgresses.length;
    const totalCompletions = videoProgresses.filter(vp => vp.isCompleted).length;
    const totalWatchTime = videoProgresses.reduce((sum, vp) => sum + vp.watchTimeSeconds, 0);
    const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
    const completionRate = totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0;

    res.status(200).json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        playlist: video.playlist,
      },
      analytics: {
        totalViews,
        totalCompletions,
        uniqueStudents: new Set(videoProgresses.map(vp => vp.studentId)).size,
        totalWatchTimeSeconds: totalWatchTime,
        totalWatchTimeMinutes: Math.round((totalWatchTime / 60) * 100) / 100,
        averageWatchTimeSeconds: Math.round(averageWatchTime),
        averageWatchTimeMinutes: Math.round((averageWatchTime / 60) * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        dropOffTimestamps,
        studentProgress: videoProgresses.map(vp => ({
          studentId: vp.studentId,
          studentName: vp.student.fullName,
          studentEmail: vp.student.email,
          watchTimeSeconds: vp.watchTimeSeconds,
          progressPercent: parseFloat(vp.progressPercent),
          isCompleted: vp.isCompleted,
          replayCount: vp.replayCount,
        })),
      },
    });
  } catch (error) {
    console.error('Error in getVideoAnalytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getStudentDetailedAnalytics,
  getAdminDetailedAnalytics,
  getVideoAnalytics,
};

