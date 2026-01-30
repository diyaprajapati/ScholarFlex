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

    // Get ALL VideoProgress entries to check completion status (needed for filtering activity logs)
    // Also need playlistId to find next videos
    const allVideoProgresses = await prisma.videoProgress.findMany({
      where: {
        studentId: student.id,
      },
      select: {
        videoId: true,
        playlistId: true, // Include playlistId to find next videos
        isCompleted: true,
        progressPercent: true, // Include progressPercent to check for 100% completion
        updatedAt: true, // Include updatedAt to find most recently completed video
        completedAt: true, // Include completedAt to find most recently completed video
        video: {
          select: {
            youtubeUrl: true,
          },
        },
      },
    });

    // Create comprehensive maps of completed videos for quick lookup
    // Map by youtubeUrl, videoId, and also store progressPercent for additional filtering
    const completedVideosMap = new Map();
    const completedVideoIdsMap = new Map();
    const allVideoProgressMap = new Map(); // Store all progress for final verification
    
    allVideoProgresses.forEach(vp => {
      const videoUrl = vp.video?.youtubeUrl;
      const videoId = vp.videoId;
      
      // Store all progress entries for final verification
      if (videoUrl) {
        allVideoProgressMap.set(videoUrl, vp);
      }
      if (videoId) {
        allVideoProgressMap.set(`id_${videoId}`, vp);
      }
      
      // Mark completed videos
      if (vp.isCompleted) {
        if (videoUrl) {
          completedVideosMap.set(videoUrl, true);
        }
        if (videoId) {
          completedVideoIdsMap.set(videoId, true);
        }
      }
      
      // Also mark videos with 100% progress as completed (even if isCompleted flag isn't set)
      const progressPercent = typeof vp.progressPercent === 'object' && vp.progressPercent.toNumber
        ? vp.progressPercent.toNumber()
        : Number(vp.progressPercent || 0);
      
      if (progressPercent >= 100) {
        if (videoUrl) {
          completedVideosMap.set(videoUrl, true);
        }
        if (videoId) {
          completedVideoIdsMap.set(videoId, true);
        }
      }
    });

    // Get videos from VideoProgress table (new tracking system)
    // We treat a video as \"continue watching\" if:
    // - It is not completed (isCompleted: false)
    // - AND progress is less than 100% (to catch edge cases where isCompleted might not be set)
    // - AND (has some progress OR has startedWatching set OR has any watch time)
    // CRITICAL: Use AND condition to ensure isCompleted is false AND progressPercent < 100
    const videoProgresses = await prisma.videoProgress.findMany({
      where: {
        studentId: student.id,
        AND: [
          { isCompleted: false },
          { progressPercent: { lt: 100 } },
          {
            OR: [
              { progressPercent: { gt: 0 } },
              { startedWatching: { not: null } },
              { watchTimeSeconds: { gt: 0 } },
            ],
          },
        ],
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
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    // Also get from activity logs (old tracking system) for backward compatibility
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
      take: 100,
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
      
      if (!videoId && !youtubeUrl) return;
      
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
          maxCurrentTime: 0, // Track maximum currentTime for lastPosition
          isCompleted: false,
          latestTimestamp: log.timestamp,
          latestActivityLogId: log.id,
        });
      }
      
      const videoData = videoMap.get(key);
      
      if (new Date(log.timestamp) > new Date(videoData.latestTimestamp)) {
        videoData.latestTimestamp = log.timestamp;
        videoData.latestActivityLogId = log.id;
      }
      
      if (activityType === 'video_complete') {
        videoData.isCompleted = true;
        videoData.maxProgress = 100;
      }
      
      if (activityType === 'video_progress' && metadata.progress) {
        const progress = parseInt(metadata.progress) || 0;
        if (progress > videoData.maxProgress) {
          videoData.maxProgress = progress;
        }
        
        // Extract currentTime from metadata for lastPosition
        const currentTime = metadata.currentTime || metadata.current_time || 0;
        if (currentTime > 0 && currentTime > videoData.maxCurrentTime) {
          videoData.maxCurrentTime = Number(currentTime);
        }
      }
    });
    
    // Combine VideoProgress data with activity log data
    const videosFromProgress = videoProgresses.map(vp => {
      // Normalize numeric fields in case they're Prisma Decimals
      const progressPercent = vp.progressPercent
        ? (typeof vp.progressPercent === 'object' && vp.progressPercent.toNumber
            ? vp.progressPercent.toNumber()
            : Number(vp.progressPercent))
        : 0;

      const lastPosition = vp.lastPosition
        ? (typeof vp.lastPosition === 'object' && vp.lastPosition.toNumber
            ? vp.lastPosition.toNumber()
            : Number(vp.lastPosition))
        : 0;

      return {
        id: vp.videoId, // Use videoId as id for consistency (database video ID)
        videoId: vp.videoId, // Database video ID
        videoTitle: vp.video.title,
        title: vp.video.title, // Also include 'title' for frontend compatibility
        playlistId: vp.playlistId,
        playlistTitle: vp.video.playlist?.title || null,
        youtubeUrl: vp.video.youtubeUrl,
        timestamp: vp.updatedAt,
        activityType: 'video_progress',
        progress: progressPercent,
        progressPercent: progressPercent, // Also include progressPercent
        lastPosition,
        // Include video table ID for filtering
        videoTableId: vp.video.id,
      };
    });

    // Get in-progress videos from activity logs
    // CRITICAL: Exclude videos that are marked as completed in VideoProgress
    const inProgressVideosFromLogs = Array.from(videoMap.values())
      .filter(video => {
        // Filter out completed videos (from activity log metadata)
        if (video.isCompleted) {
          // console.log(`[Continue Watching] Excluding "${video.videoTitle || video.videoId}" from activity logs - marked as completed in metadata`);
          return false;
        }
        
        // Filter out videos with 100% progress (completed)
        if (video.maxProgress >= 100) {
          // console.log(`[Continue Watching] Excluding "${video.videoTitle || video.videoId}" from activity logs - progress is 100%`);
          return false;
        }
        
        // Filter out videos with no progress
        if (video.maxProgress <= 0) {
          return false;
        }
        
        // CRITICAL: Check if this video is marked as completed in VideoProgress
        // If it exists in VideoProgress as completed, exclude it even if activity logs show it as incomplete
        let finalYoutubeUrl = video.youtubeUrl;
        if (!finalYoutubeUrl && video.videoId) {
          finalYoutubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        }
        
        // Check by YouTube URL
        if (finalYoutubeUrl && completedVideosMap.has(finalYoutubeUrl)) {
          // console.log(`[Continue Watching] Excluding "${video.videoTitle || video.videoId}" from activity logs - completed by URL in VideoProgress`);
          return false; // Exclude - this video is completed in VideoProgress
        }
        
        // Check by videoId as well (in case URL doesn't match)
        // Try both YouTube ID (string) and database ID (number)
        if (video.videoId) {
          // Check as-is (might be YouTube ID string)
          if (completedVideoIdsMap.has(video.videoId)) {
            // console.log(`[Continue Watching] Excluding "${video.videoTitle || video.videoId}" from activity logs - completed by videoId (as-is) in VideoProgress`);
            return false;
          }
          
          // Try as number (database ID)
          const videoIdNum = typeof video.videoId === 'string' ? parseInt(video.videoId, 10) : video.videoId;
          if (!isNaN(videoIdNum) && videoIdNum > 0 && completedVideoIdsMap.has(videoIdNum)) {
            // console.log(`[Continue Watching] Excluding "${video.videoTitle || video.videoId}" from activity logs - completed by videoId (as number) in VideoProgress`);
            return false;
          }
        }
        
        return true;
      })
      .map((videoData) => {
        let finalYoutubeUrl = videoData.youtubeUrl;
        if (!finalYoutubeUrl && videoData.videoId) {
          finalYoutubeUrl = `https://www.youtube.com/watch?v=${videoData.videoId}`;
        }
        
        return {
          id: videoData.latestActivityLogId,
          videoId: videoData.videoId, // This might be YouTube ID, not database ID
          videoTitle: videoData.videoTitle,
          title: videoData.videoTitle, // Also include 'title' for frontend compatibility
          playlistId: videoData.playlistId,
          playlistTitle: videoData.playlistTitle,
          youtubeUrl: finalYoutubeUrl,
          timestamp: videoData.latestTimestamp,
          activityType: 'video_progress',
          progress: videoData.maxProgress,
          progressPercent: videoData.maxProgress, // Also include progressPercent
          lastPosition: videoData.maxCurrentTime || 0, // Include lastPosition from currentTime
          // Note: videoId here might be YouTube ID from activity logs, not database videoId
        };
      });

    // Combine both sources, remove duplicates (by youtubeUrl), and prioritize VideoProgress data
    // VideoProgress has more accurate lastPosition data and completion status
    // CRITICAL: Always prioritize VideoProgress entries over activity log entries
    const uniqueVideos = new Map();
    
    // First, add all VideoProgress entries (these are the source of truth)
    videosFromProgress.forEach(video => {
      const key = video.youtubeUrl || `video_${video.videoId}`;
      uniqueVideos.set(key, video);
    });
    
    // Then, add activity log entries only if they don't already exist in VideoProgress
    // This ensures VideoProgress data always takes precedence
    inProgressVideosFromLogs.forEach(video => {
      const key = video.youtubeUrl || `video_${video.videoId}`;
      // Only add if not already present (VideoProgress entries take precedence)
      if (!uniqueVideos.has(key)) {
        uniqueVideos.set(key, video);
      }
      // If it exists, VideoProgress entry is already there and is more accurate, so skip
    });

    // Final filter: Explicitly exclude any videos that are completed in VideoProgress
    // This is a safety check to ensure no completed videos slip through
    // CRITICAL: Query database directly for any videos we're unsure about
    // Get ALL video IDs from both sources (VideoProgress and activity logs)
    const allVideoIdsToCheck = new Set();
    videosFromProgress.forEach(v => {
      if (v.videoId) allVideoIdsToCheck.add(v.videoId);
      if (v.id) allVideoIdsToCheck.add(v.id);
    });
    inProgressVideosFromLogs.forEach(v => {
      if (v.videoId) allVideoIdsToCheck.add(v.videoId);
      if (v.id) allVideoIdsToCheck.add(v.id);
    });
    
    const videoIdsToCheck = Array.from(allVideoIdsToCheck)
      .map(id => {
        // Convert to integer - videoId in database is Int, not string
        const numId = typeof id === 'string' ? parseInt(id, 10) : id;
        return isNaN(numId) ? null : numId;
      })
      .filter(id => id != null); // Remove any that couldn't be converted to int
    
    // Get fresh completion status from database for all videos
    // Also get by YouTube URL to catch any mismatches
    const allVideoUrlsToCheck = new Set();
    videosFromProgress.forEach(v => {
      if (v.youtubeUrl) allVideoUrlsToCheck.add(v.youtubeUrl);
    });
    inProgressVideosFromLogs.forEach(v => {
      if (v.youtubeUrl) allVideoUrlsToCheck.add(v.youtubeUrl);
    });
    const videoUrlsToCheck = Array.from(allVideoUrlsToCheck);
    
    // Build where clause - only include videoId if we have valid integer IDs
    const whereClause = {
      studentId: student.id,
    };
    
    if (videoIdsToCheck.length > 0 && videoUrlsToCheck.length > 0) {
      whereClause.OR = [
        { videoId: { in: videoIdsToCheck } },
        { video: { youtubeUrl: { in: videoUrlsToCheck } } },
      ];
    } else if (videoIdsToCheck.length > 0) {
      whereClause.videoId = { in: videoIdsToCheck };
    } else if (videoUrlsToCheck.length > 0) {
      whereClause.video = { youtubeUrl: { in: videoUrlsToCheck } };
    } else {
      // No videos to check, skip the query
      whereClause.videoId = { in: [] }; // Empty array will return no results
    }
    
    const freshCompletionStatus = await prisma.videoProgress.findMany({
      where: whereClause,
      select: {
        videoId: true, // This is the database videoId (Int)
        isCompleted: true,
        progressPercent: true,
        video: {
          select: {
            youtubeUrl: true,
            id: true, // Video table ID (same as videoId in VideoProgress)
          },
        },
      },
    });
    
    // Create a fresh map of completed videos (check by URL, videoId, and video.id)
    const freshCompletedMap = new Map();
    freshCompletionStatus.forEach(vp => {
      const progressPercent = typeof vp.progressPercent === 'object' && vp.progressPercent.toNumber
        ? vp.progressPercent.toNumber()
        : Number(vp.progressPercent || 0);
      
      if (vp.isCompleted || progressPercent >= 100) {
        // Map by YouTube URL (most reliable identifier)
        if (vp.video?.youtubeUrl) {
          freshCompletedMap.set(vp.video.youtubeUrl, true);
          // Also extract YouTube ID from URL for matching
          const youtubeIdMatch = vp.video.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
          if (youtubeIdMatch && youtubeIdMatch[1]) {
            freshCompletedMap.set(youtubeIdMatch[1], true); // YouTube video ID
          }
        }
        // Map by videoId (database ID - Int)
        if (vp.videoId) {
          freshCompletedMap.set(vp.videoId, true);
          freshCompletedMap.set(Number(vp.videoId), true);
          freshCompletedMap.set(String(vp.videoId), true);
        }
        // Map by video.id (video table ID - should be same as videoId)
        if (vp.video?.id) {
          freshCompletedMap.set(vp.video.id, true);
          freshCompletedMap.set(Number(vp.video.id), true);
          freshCompletedMap.set(String(vp.video.id), true);
        }
      }
    });
    
    // console.log(`[Continue Watching] Fresh completion map has ${freshCompletedMap.size} entries`);
    
    // console.log(`[Continue Watching] Found ${freshCompletionStatus.length} video progress entries, ${freshCompletedMap.size} completed videos in fresh check`);
    
    const finalVideos = Array.from(uniqueVideos.values())
      .filter(video => {
        const videoUrl = video.youtubeUrl;
        const videoId = video.videoId; // This is the database video ID
        const videoTableId = video.videoTableId || video.id; // Video table ID (same as videoId usually)
        
        // CRITICAL: Check fresh database state FIRST (most reliable)
        // Check by videoId (database video ID) - this is the primary key
        if (videoId) {
          const videoIdNum = typeof videoId === 'string' ? parseInt(videoId, 10) : videoId;
          if (!isNaN(videoIdNum) && videoIdNum > 0) {
            if (freshCompletedMap.has(videoIdNum) || freshCompletedMap.has(String(videoIdNum))) {
              // console.log(`[Continue Watching] Excluding "${video.videoTitle || videoId}" (videoId: ${videoIdNum}) - completed in fresh DB check`);
              return false;
            }
          }
        }
        
        // Check by videoTableId if available
        if (videoTableId) {
          const tableIdNum = typeof videoTableId === 'string' ? parseInt(videoTableId, 10) : videoTableId;
          if (!isNaN(tableIdNum) && tableIdNum > 0) {
            if (freshCompletedMap.has(tableIdNum) || freshCompletedMap.has(String(tableIdNum))) {
              // console.log(`[Continue Watching] Excluding "${video.videoTitle || videoId}" (tableId: ${tableIdNum}) - completed in fresh DB check`);
              return false;
            }
          }
        }
        
        // Check by YouTube URL
        if (videoUrl && freshCompletedMap.has(videoUrl)) {
          // console.log(`[Continue Watching] Excluding "${video.videoTitle || videoId}" - completed in fresh DB check (URL)`);
          return false;
        }
        
        // Extract YouTube ID from URL and check
        if (videoUrl) {
          const youtubeIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
          if (youtubeIdMatch && youtubeIdMatch[1] && freshCompletedMap.has(youtubeIdMatch[1])) {
            // console.log(`[Continue Watching] Excluding "${video.videoTitle || videoId}" - completed in fresh DB check (YouTube ID)`);
            return false;
          }
        }
        
        // Skip if marked as completed by URL in original map
        if (videoUrl && completedVideosMap.has(videoUrl)) {
          // console.log(`[Continue Watching] Excluding "${video.videoTitle || videoId}" - completed by URL in original map`);
          return false;
        }
        
        // Skip if marked as completed by videoId in original map
        if (videoId && completedVideoIdsMap.has(videoId)) {
          // console.log(`[Continue Watching] Excluding "${video.videoTitle || videoId}" - completed by videoId in original map`);
          return false;
        }
        
        // Skip if progress is 100% (completed)
        if (video.progress >= 100) {
          // console.log(`[Continue Watching] Excluding "${video.videoTitle || videoId}" - progress is 100%`);
          return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      // Don't slice here - we'll combine with next videos first, then slice

    // Add next videos from playlists where a video was just completed
    // This ensures the next video appears in continue watching even if not started yet
    const nextVideosToAdd = [];
    const addedVideoIds = new Set(finalVideos.map(v => v.videoId).filter(id => id != null));
    const addedVideoUrls = new Set(finalVideos.map(v => v.youtubeUrl).filter(url => url != null));
    
    // Find completed videos that belong to playlists
    // Only consider videos that have a playlistId (not standalone videos)
    // IMPORTANT: Include ALL completed videos (not just recent ones) to show next videos
    // This ensures that if you complete a video, the next one always appears
    const completedVideosWithPlaylists = allVideoProgresses.filter(vp => {
      const progressPercent = typeof vp.progressPercent === 'object' && vp.progressPercent.toNumber
        ? vp.progressPercent.toNumber()
        : Number(vp.progressPercent || 0);
      
      const isCompleted = vp.isCompleted || progressPercent >= 100;
      const hasPlaylist = vp.videoId && vp.playlistId;
      
      return isCompleted && hasPlaylist;
    });
    
    // console.log(`[Continue Watching] Found ${completedVideosWithPlaylists.length} completed videos with playlists:`, 
    //   completedVideosWithPlaylists.map(vp => ({ 
    //     videoId: vp.videoId, 
    //     playlistId: vp.playlistId,
    //     isCompleted: vp.isCompleted,
    //     progressPercent: typeof vp.progressPercent === 'object' && vp.progressPercent.toNumber ? vp.progressPercent.toNumber() : Number(vp.progressPercent || 0),
    //     completedAt: vp.completedAt,
    //     updatedAt: vp.updatedAt
    //   })));
    
    // Process ALL completed videos to find next videos
    // This ensures that if you complete video 2, video 3 appears (even if you also completed video 10)
    // We'll check each completed video and add its next video if it's not already in the list
    // console.log(`[Continue Watching] Processing ${completedVideosWithPlaylists.length} completed videos to find next videos`);
    
    // For each completed video, find the next video in its playlist
    for (const completedVp of completedVideosWithPlaylists) {
      try {
        // console.log(`[Continue Watching] 🔍 Processing completed video ID: ${completedVp.videoId}, playlistId: ${completedVp.playlistId}`);
        
        // Get the completed video's details
        const completedVideo = await prisma.video.findUnique({
          where: { id: completedVp.videoId },
          include: {
            playlist: {
              include: {
                videos: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        });
        
        if (!completedVideo) {
          // console.log(`[Continue Watching] Completed video ${completedVp.videoId} not found in database`);
          continue;
        }
        
        if (!completedVideo.playlist) {
          // console.log(`[Continue Watching] Completed video ${completedVp.videoId} has no playlist`);
          continue;
        }
        
        // console.log(`[Continue Watching] Found playlist "${completedVideo.playlist.title}" with ${completedVideo.playlist.videos.length} videos`);
        
        // Find the index of the completed video in the playlist by orderIndex
        // Sort videos by orderIndex to ensure correct order
        const sortedVideos = [...completedVideo.playlist.videos].sort((a, b) => a.orderIndex - b.orderIndex);
        const completedIndex = sortedVideos.findIndex(v => v.id === completedVideo.id);
        // console.log(`[Continue Watching] Completed video "${completedVideo.title}" (ID: ${completedVideo.id}, orderIndex: ${completedVideo.orderIndex}) is at index ${completedIndex} in sorted playlist (total: ${sortedVideos.length} videos)`);
        
        if (completedIndex < 0) {
          // console.log(`[Continue Watching] ❌ Completed video not found in playlist videos array`);
          continue;
        }
        
        if (completedIndex >= sortedVideos.length - 1) {
          // console.log(`[Continue Watching] ❌ Completed video is the last video in playlist (index ${completedIndex} of ${sortedVideos.length}), no next video`);
          continue; // No next video
        }
        
        // Get the next video by orderIndex (not just array index)
        const nextVideo = sortedVideos[completedIndex + 1];
        if (!nextVideo) {
          // console.log(`[Continue Watching] ❌ No next video found at index ${completedIndex + 1}`);
          continue;
        }
        
        // console.log(`[Continue Watching] ✅ Found next video "${nextVideo.title}" (ID: ${nextVideo.id}, orderIndex: ${nextVideo.orderIndex}) after "${completedVideo.title}" (orderIndex: ${completedVideo.orderIndex})`);
        
        // Check if next video is already in the list or is completed
        const nextVideoUrl = nextVideo.youtubeUrl;
        const nextVideoId = nextVideo.id;
        
        // console.log(`[Continue Watching] Checking next video "${nextVideo.title}" (ID: ${nextVideoId}) after completed video "${completedVideo.title}"`);
        
        // Check if next video has progress entry
        const nextVideoProgress = allVideoProgresses.find(vp => vp.videoId === nextVideoId);
        let nextProgressPercent = 0;
        
        if (nextVideoProgress) {
          nextProgressPercent = typeof nextVideoProgress.progressPercent === 'object' && nextVideoProgress.progressPercent.toNumber
            ? nextVideoProgress.progressPercent.toNumber()
            : Number(nextVideoProgress.progressPercent || 0);
          
          // Skip if next video is completed
          if (nextVideoProgress.isCompleted || nextProgressPercent >= 100) {
            // console.log(`[Continue Watching] Skipping "${nextVideo.title}" - already completed (${nextProgressPercent}%)`);
            continue;
          }
        }
        
        // Also check completed maps (for videos completed but not in allVideoProgresses)
        if (completedVideosMap.has(nextVideoUrl) || completedVideoIdsMap.has(nextVideoId)) {
          // console.log(`[Continue Watching] Skipping "${nextVideo.title}" - marked as completed in maps`);
          continue;
        }
        
        // Check if next video is already in finalVideos (even if it's a video_next type)
        // If it's in finalVideos with progress > 0, user started watching it, so don't add duplicate
        // But if it's in finalVideos as video_next with 0% progress, we should still add it (it's the same video)
        const alreadyInFinalVideos = finalVideos.some(v => {
          const vId = v.videoId || v.id;
          const vProgress = v.progress || v.progressPercent || 0;
          // If it's the same video AND has progress, user started watching it
          if ((vId === nextVideoId || v.youtubeUrl === nextVideoUrl) && vProgress > 0) {
            return true;
          }
          return false;
        });
        
        const alreadyInNextVideos = nextVideosToAdd.some(v => {
          const vId = v.videoId || v.id;
          return vId === nextVideoId || v.youtubeUrl === nextVideoUrl;
        });
        
        if (alreadyInFinalVideos) {
          // Next video is already in the list with progress - user started watching it
          // console.log(`[Continue Watching] Next video "${nextVideo.title}" (ID: ${nextVideoId}) is already in continue watching list with progress (${nextProgressPercent}%) - skipping duplicate`);
          continue;
        }
        
        if (alreadyInNextVideos) {
          // Already added to nextVideosToAdd - skip duplicate
          // console.log(`[Continue Watching] Next video "${nextVideo.title}" (ID: ${nextVideoId}) is already in nextVideosToAdd - skipping duplicate`);
          continue;
        }
        
        // Video is not in the list - ADD IT
        // This is the key: when you complete a video, the next one should ALWAYS appear
        // Even if it has 0% progress and hasn't been started yet
        // console.log(`[Continue Watching] ✅ Adding next video "${nextVideo.title}" (ID: ${nextVideoId}) - not in list, progress: ${nextProgressPercent}%`);
        
        // Add next video to continue watching (not started yet, but next in playlist)
        // Use a timestamp slightly in the past so it appears after in-progress videos
        const nextVideoTimestamp = new Date();
        nextVideoTimestamp.setSeconds(nextVideoTimestamp.getSeconds() - 1); // 1 second ago
        
        nextVideosToAdd.push({
          id: nextVideo.id,
          videoId: nextVideo.id,
          videoTitle: nextVideo.title,
          title: nextVideo.title, // Also include 'title' for frontend compatibility
          playlistId: completedVideo.playlistId,
          playlistTitle: completedVideo.playlist.title,
          youtubeUrl: nextVideo.youtubeUrl,
          timestamp: nextVideoTimestamp,
          activityType: 'video_next',
          progress: 0,
          progressPercent: 0, // Also include progressPercent
          lastPosition: 0,
        });
        
        // console.log(`[Continue Watching] Adding next video "${nextVideo.title}" from playlist "${completedVideo.playlist.title}"`);
      } catch (err) {
        console.error(`Error finding next video for completed video ${completedVp.videoId}:`, err);
        // Continue with next completed video
      }
    }
    
    // Combine final videos with next videos
    // CRITICAL: Filter out any next videos that are now completed (user completed a video_next video)
    const filteredNextVideos = nextVideosToAdd.filter(nextVideo => {
      const nextVideoId = nextVideo.videoId || nextVideo.id;
      const nextVideoUrl = nextVideo.youtubeUrl;
      
      // Check if this next video is now completed
      if (nextVideoId) {
        const videoIdNum = typeof nextVideoId === 'string' ? parseInt(nextVideoId, 10) : nextVideoId;
        if (!isNaN(videoIdNum) && videoIdNum > 0) {
          if (freshCompletedMap.has(videoIdNum) || freshCompletedMap.has(String(videoIdNum))) {
            // console.log(`[Continue Watching] Filtering out completed video_next video "${nextVideo.videoTitle}" (ID: ${videoIdNum})`);
            return false;
          }
        }
      }
      
      if (nextVideoUrl && freshCompletedMap.has(nextVideoUrl)) {
        // console.log(`[Continue Watching] Filtering out completed video_next video "${nextVideo.videoTitle}" (URL)`);
        return false;
      }
      
      return true;
    });
    
    // CRITICAL: Remove video_next entries from filteredNextVideos if they already exist in finalVideos
    // This prevents duplicates when a video_next video starts getting progress tracked
    // If a video exists in finalVideos (with progress), use that instead of the video_next version
    const finalVideosMap = new Map();
    finalVideos.forEach(v => {
      // Create multiple keys for robust matching
      const urlKey = v.youtubeUrl;
      const videoIdKey = v.videoId || v.id;
      const idKey = `video_${videoIdKey}`;
      
      if (urlKey) finalVideosMap.set(urlKey, v);
      if (videoIdKey) {
        finalVideosMap.set(videoIdKey, v);
        finalVideosMap.set(String(videoIdKey), v);
        finalVideosMap.set(Number(videoIdKey), v);
      }
      if (idKey) finalVideosMap.set(idKey, v);
    });
    
    // Filter out next videos that are already in finalVideos (even with 0% progress)
    // This ensures we don't show duplicates when video_next videos start tracking
    const deduplicatedNextVideos = filteredNextVideos.filter(nextVideo => {
      const nextVideoId = nextVideo.videoId || nextVideo.id;
      const nextVideoUrl = nextVideo.youtubeUrl;
      
      // Check by URL first (most reliable)
      if (nextVideoUrl && finalVideosMap.has(nextVideoUrl)) {
        const existingVideo = finalVideosMap.get(nextVideoUrl);
        const existingProgress = existingVideo.progress || existingVideo.progressPercent || 0;
        // console.log(`[Continue Watching] Skipping video_next duplicate "${nextVideo.videoTitle}" (URL match) - already in finalVideos with ${existingProgress}% progress`);
        return false;
      }
      
      // Check by videoId (database ID)
      if (nextVideoId) {
        const videoIdNum = typeof nextVideoId === 'string' ? parseInt(nextVideoId, 10) : nextVideoId;
        if (!isNaN(videoIdNum) && videoIdNum > 0) {
          if (finalVideosMap.has(videoIdNum) || finalVideosMap.has(String(videoIdNum)) || finalVideosMap.has(Number(videoIdNum))) {
            const existingVideo = finalVideosMap.get(videoIdNum) || finalVideosMap.get(String(videoIdNum)) || finalVideosMap.get(Number(videoIdNum));
            const existingProgress = existingVideo?.progress || existingVideo?.progressPercent || 0;
            // console.log(`[Continue Watching] Skipping video_next duplicate "${nextVideo.videoTitle}" (ID: ${videoIdNum}) - already in finalVideos with ${existingProgress}% progress`);
            return false;
          }
        }
      }
      
      return true;
    });
    
    // IMPORTANT: Next videos should appear immediately after completion, so prioritize them
    // Sort by: 1) In-progress videos first (by timestamp DESC), 2) Next videos (by timestamp DESC)
    const allContinueWatchingVideos = [...finalVideos, ...deduplicatedNextVideos]
      .sort((a, b) => {
        const aIsNext = a.activityType === 'video_next';
        const bIsNext = b.activityType === 'video_next';
        
        // If both are same type, sort by timestamp (most recent first)
        if (aIsNext === bIsNext) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        }
        
        // In-progress videos come before next videos (but both are shown)
        return aIsNext ? 1 : -1;
      })
      .slice(0, 10); // Get top 10 most recent
    
    // console.log(`[Continue Watching] Final result: ${allContinueWatchingVideos.length} videos`);
    // console.log(`[Continue Watching] Breakdown: ${finalVideos.length} in-progress, ${nextVideosToAdd.length} next videos found, ${filteredNextVideos.length} next videos after filtering completed ones, ${deduplicatedNextVideos.length} next videos after deduplication`);
    if (deduplicatedNextVideos.length > 0) {
      // console.log(`[Continue Watching] Next videos added:`, deduplicatedNextVideos.map(v => ({ title: v.videoTitle, id: v.videoId })));
    }
    
    // console.log(`[Continue Watching] Returning ${allContinueWatchingVideos.length} videos (${finalVideos.length} in-progress + ${deduplicatedNextVideos.length} next videos)`);
    // console.log(`[Continue Watching] Final video list:`, allContinueWatchingVideos.map(v => ({ 
    //   title: v.videoTitle || v.title, 
    //   id: v.videoId, 
    //   type: v.activityType,
    //   progress: v.progress 
    // })));
    
    res.status(200).json({
      success: true,
      message: 'Recent video activities retrieved successfully',
      videos: allContinueWatchingVideos,
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

    // CRITICAL: First check VideoProgress table (most accurate source)
    let videoProgressData = null;
    if (videoId) {
      // Try to find by videoId in VideoProgress table
      const videoProgress = await prisma.videoProgress.findFirst({
        where: {
          studentId: student.id,
          videoId: parseInt(videoId),
        },
        include: {
          video: {
            select: {
              youtubeUrl: true,
            },
          },
        },
      });
      
      if (videoProgress) {
        const lastPosition = videoProgress.lastPosition
          ? (typeof videoProgress.lastPosition === 'object' && videoProgress.lastPosition.toNumber
              ? videoProgress.lastPosition.toNumber()
              : Number(videoProgress.lastPosition))
          : 0;
        
        videoProgressData = {
          currentTime: lastPosition,
          progress: Number(videoProgress.progressPercent) || 0,
          duration: null,
          timestamp: videoProgress.updatedAt,
        };
      }
    } else if (youtubeUrl) {
      // Try to find by youtubeUrl - need to find video first
      const video = await prisma.video.findFirst({
        where: {
          youtubeUrl: youtubeUrl,
        },
        select: {
          id: true,
        },
      });
      
      if (video) {
        const videoProgress = await prisma.videoProgress.findFirst({
          where: {
            studentId: student.id,
            videoId: video.id,
          },
        });
        
        if (videoProgress) {
          const lastPosition = videoProgress.lastPosition
            ? (typeof videoProgress.lastPosition === 'object' && videoProgress.lastPosition.toNumber
                ? videoProgress.lastPosition.toNumber()
                : Number(videoProgress.lastPosition))
            : 0;
          
          videoProgressData = {
            currentTime: lastPosition,
            progress: Number(videoProgress.progressPercent) || 0,
            duration: null,
            timestamp: videoProgress.updatedAt,
          };
        }
      }
    }

    // If we found VideoProgress data, use it (most accurate)
    if (videoProgressData && videoProgressData.currentTime > 0) {
      return res.status(200).json({
        success: true,
        progress: videoProgressData.progress,
        currentTime: videoProgressData.currentTime,
        duration: videoProgressData.duration,
        timestamp: videoProgressData.timestamp,
      });
    }

    // Fallback: Check activity logs (for backward compatibility)
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
      take: 100,
    });

    const matchingLogs = allActivityLogs.filter((log) => {
      const metadata = log.metadata || {};
      const logVideoId = metadata.videoId || metadata.video_id || null;
      const logYoutubeUrl = metadata.youtubeUrl || metadata.youtube_url || null;
      
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

