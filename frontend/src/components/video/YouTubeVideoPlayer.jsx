import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { authService } from '../../utils/auth';

/**
 * YouTube Video Player Component with Activity Tracking
 * 
 * Features:
 * - Embeds YouTube videos using IFrame API
 * - Tracks video start, completion, and progress milestones (25%, 50%, 75%)
 * - Logs activities to backend
 */
const YouTubeVideoPlayer = ({ videoId, videoTitle, videoUrl, playlistId, playlistTitle, onVideoEnd, startTime = 0, dbVideoId = null }) => {
  const location = useLocation();
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [error, setError] = useState(null);

  // Keep track of latest start time to avoid stale closures in effects
  const startTimeRef = useRef(startTime);

  // Keep track of tracking IDs to avoid stale closures in intervals/callbacks
  const trackingRef = useRef({
    dbVideoId: dbVideoId || videoId, // Initial fallbacks
    playlistId: playlistId
  });

  // Prevent duplicate tracking calls (React strict mode causes double-invocation)
  const trackingInProgressRef = useRef(new Set());

  // Helper to safely parse IDs
  const safeParseInt = (val) => {
    if (!val) return null;
    const parsed = parseInt(val);
    return isNaN(parsed) ? null : parsed;
  };

  // Update refs when props change
  useEffect(() => {
    startTimeRef.current = startTime;
    // CRITICAL: Only use dbVideoId (database ID), never videoId (YouTube ID string)
    const dbVideoIdInt = safeParseInt(dbVideoId);
    trackingRef.current = {
      dbVideoId: dbVideoIdInt, // Only database ID, null if not available
      playlistId: safeParseInt(playlistId)
    };

    // console.log('📊 Tracking Params Updated:', trackingRef.current, {
    //   dbVideoId,
    //   videoId,
    //   parsedDbVideoId: dbVideoIdInt
    // });
  }, [startTime, dbVideoId, videoId, playlistId]);

  // NOTE: We recreate the player in the init effect (dependency includes startTime).
  // Destroying here can race with initialization and cause 0:00 starts.

  // Track progress milestones to avoid duplicate logging
  const progressMilestones = useRef({
    started: false,
    completed: false,
    milestone25: false,
    milestone50: false,
    milestone75: false,
  });

  // Track last logged time to avoid too frequent updates
  const lastLoggedTime = useRef(0);
  const lastLoggedProgress = useRef(0);

  // Extract video ID from URL if not provided directly
  const extractVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const finalVideoId = videoId || extractVideoId(videoUrl);
  // CRITICAL: finalDbVideoId should ONLY be the database ID (integer), never YouTube ID (string)
  // Use dbVideoId if it's a valid integer, otherwise null (don't fallback to videoId which is YouTube ID)
  const finalDbVideoId = safeParseInt(dbVideoId) || null;

  // Helper: detect open student mode
  // Use authService to check role instead of checking route paths
  // This works with consolidated routes where open students use /student/video/ instead of /student/open/video/
  const isOpenStudent = () => {
    try {
      if (typeof window === 'undefined') return false;
      
      // Use authService to check if user is an open student
      // This checks for open_student_token and doesn't require route path matching
      return authService.isOpenStudent();
    } catch {
      return false;
    }
  };

  // Helper: track progress for open students
  const trackOpenStudentProgress = async (currentTime, progressPercent, durationSeconds) => {
    const { dbVideoId, playlistId } = trackingRef.current;

    // Ensure we have a valid ID before tracking
    if (!dbVideoId || !isOpenStudent()) {
      // console.log('Skipping open student tracking: Missing dbVideoId or not open student', { dbVideoId });
      return;
    }

    // Create a unique key for this tracking request to prevent duplicates
    // Round values to prevent too many unique keys for similar progress
    const roundedTime = Math.round(currentTime ?? 0);
    const roundedProgress = Math.round(progressPercent ?? 0);
    const trackingKey = `${dbVideoId}-${roundedTime}-${roundedProgress}`;
    
    // Skip if this exact tracking request is already in progress
    if (trackingInProgressRef.current.has(trackingKey)) {
      return; // Silently skip duplicate
    }

    // Mark as in progress
    trackingInProgressRef.current.add(trackingKey);

    try {
      await api.openStudent.trackVideoProgress({
        videoId: dbVideoId,
        playlistId: playlistId,
        watchTimeSeconds: roundedTime,
        progressPercent: typeof progressPercent === 'number' ? progressPercent : 0,
        lastPosition: typeof currentTime === 'number' ? currentTime : 0,
      });
    } catch (err) {
      // Log error but don't re-throw - this is non-critical
      // The backend will handle unique constraint violations gracefully
      if (!err.message?.includes('Unique constraint')) {
        console.error('Error tracking open student video progress:', err);
      }
    } finally {
      // Remove from in-progress set after a short delay to allow for rapid updates
      setTimeout(() => {
        trackingInProgressRef.current.delete(trackingKey);
      }, 2000); // Increased delay to handle React strict mode double-invocation
    }
  };

  // Track video opened when component mounts
  useEffect(() => {
    // CRITICAL: Only track if we have a valid integer database ID (not YouTube ID string)
    const dbVideoIdInt = safeParseInt(finalDbVideoId);
    if (dbVideoIdInt) {
      // Track for open students (only needs videoId, playlistId is optional)
      if (isOpenStudent()) {
        trackOpenStudentProgress(0, 0, 0).catch(err => {
          console.error('Error tracking open student video opened:', err);
        });
      }
      // Intern/internship tracking (playlistId is optional)
      else {
        // Track opened - playlistId is optional for standalone videos
        api.videoTracking.trackOpened(dbVideoIdInt, playlistId ? parseInt(playlistId) : null).catch(err => {
          console.error('Error tracking video opened:', err);
        });
      }
    } else {
      console.warn(`[Video Tracking] Cannot track video opened - invalid dbVideoId: ${finalDbVideoId} (expected integer database ID)`);
    }
  }, [playlistId, finalDbVideoId]);

  // Log activity to backend (keep for backward compatibility)
  const logActivity = async (activityType, metadata) => {
    try {
      await api.activity.log(activityType, metadata);
    } catch (err) {
      console.error(`Error logging ${activityType}:`, err);
    }
  };

  // Load YouTube IFrame Player API
  useEffect(() => {
    // Check if script is already loaded
    if (window.YT && window.YT.Player) {
      setIsPlayerReady(true);
      return;
    }

    // Create script element
    const scriptUrl = 'https://www.youtube.com/s/player/217a23a9/www-widgetapi.vflset/www-widgetapi.js';

    // Handle Trusted Types if available
    let finalScriptUrl = scriptUrl;
    try {
      const ttPolicy = window.trustedTypes?.createPolicy('youtube-widget-api', {
        createScriptURL: (x) => x,
      });
      if (ttPolicy) {
        finalScriptUrl = ttPolicy.createScriptURL(scriptUrl);
      }
    } catch (e) {
      // Trusted Types not available or failed, use original URL
    }

    // Initialize YT object if not exists
    if (!window.YT) {
      window.YT = { loading: 0, loaded: 0 };
    }
    if (!window.YTConfig) {
      window.YTConfig = { host: 'https://www.youtube.com' };
    }

    // Load script if not already loading
    if (!window.YT.loading) {
      window.YT.loading = 1;

      // Set up ready callback
      window.YT.ready = function (f) {
        if (window.YT.loaded) {
          f();
        } else {
          if (!window.YT.readyCallbacks) {
            window.YT.readyCallbacks = [];
          }
          window.YT.readyCallbacks.push(f);
        }
      };

      window.onYTReady = function () {
        window.YT.loaded = 1;
        window.YT.loading = 0;
        if (window.YT.readyCallbacks) {
          const callbacks = window.YT.readyCallbacks;
          window.YT.readyCallbacks = [];
          for (let i = 0; i < callbacks.length; i++) {
            try {
              callbacks[i]();
            } catch (e) {
              console.error('Error in YT ready callback:', e);
            }
          }
        }
      };

      window.YT.setConfig = function (c) {
        for (const k in c) {
          if (c.hasOwnProperty(k)) {
            window.YTConfig[k] = c[k];
          }
        }
      };

      // Create and inject script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.id = 'www-widgetapi-script';
      script.src = finalScriptUrl;
      script.async = true;

      // Handle nonce if available
      const currentScript = document.currentScript;
      if (currentScript) {
        const nonce = currentScript.nonce || currentScript.getAttribute('nonce');
        if (nonce) {
          script.setAttribute('nonce', nonce);
        }
      }

      script.onload = () => {
        setIsPlayerReady(true);
      };

      script.onerror = () => {
        setError('Failed to load YouTube IFrame Player API');
        setIsPlayerReady(false);
      };

      // Insert script before first script tag or at end of body
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.body.appendChild(script);
      }
    } else if (window.YT.loaded) {
      setIsPlayerReady(true);
    } else {
      // Script is loading, wait for it
      window.YT.ready(() => {
        setIsPlayerReady(true);
      });
    }

    // Cleanup
    return () => {
      // Don't remove script as it might be used by other components
    };
  }, []);

  // Initialize player when API is ready OR when startTime changes
  useEffect(() => {
    // console.log(`🔄 YouTubeVideoPlayer useEffect triggered:`, {
    //   isPlayerReady,
    //   finalVideoId,
    //   hasContainer: !!containerRef.current,
    //   startTime,
    // });

    if (!isPlayerReady || !finalVideoId || !containerRef.current) {
      // console.log('⏸️ Player not ready yet, waiting...');
      return;
    }

    // Destroy existing player if it exists
    if (playerRef.current && playerRef.current.destroy) {
      // console.log('🗑️ Destroying existing player before recreating...');
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.error('Error destroying existing player:', e);
      }
      playerRef.current = null;
    }

    // Initialize YouTube player
    try {
      const playerVars = {
        enablejsapi: 1,
        origin: window.location.origin,
        rel: 0,
        modestbranding: 1,
        autoplay: 1, // Enable autoplay
      };

      // CRITICAL: Use start parameter - YouTube's native way to resume
      if (startTime > 0) {
        playerVars.start = Math.floor(startTime);
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: finalVideoId,
        playerVars: playerVars,
        events: {
          onReady: (event) => {
            const player = event.target;
            const targetTime = startTimeRef.current; // Use Ref for latest value

            // console.log(`🎬 Player Ready. Seeking to ${targetTime}s`);

            // Initial seek check
            if (targetTime > 0 && player && player.seekTo) {
              // Immediate seek
              try {
                player.seekTo(targetTime, true);
                player.playVideo();
              } catch (e) { /* ignore */ }

              // Retry after short delay to ensure metadata loaded
              setTimeout(() => {
                try {
                  const currentTime = player.getCurrentTime();
                  // Convert to numbers explicitly to be safe
                  if (Math.abs(Number(currentTime) - Number(targetTime)) > 2) {
                    // console.log('🔄 Retry seek...');
                    player.seekTo(targetTime, true);
                    player.playVideo();
                  }
                } catch (err) { /* ignore */ }
              }, 1000);
            } else {
              try {
                player.playVideo();
              } catch (e) { /* ignore */ }
            }
          },
          onStateChange: (event) => {
            handlePlayerStateChange(event);
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
            setError('Failed to load video. Please check the video ID.');
          },
        },
      });
    } catch (err) {
      console.error('Error initializing YouTube player:', err);
      setError('Failed to initialize video player');
    }

    // Cleanup
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }
    };
  }, [isPlayerReady, finalVideoId]); // REMOVED startTime from dependency

  // Handle start time changes dynamically
  useEffect(() => {
    if (!playerRef.current || !startTime || startTime <= 0) return;

    try {
      const player = playerRef.current;
      if (player.seekTo) {
        // console.log(`⏩ Seeking to ${startTime}s due to prop update`);
        player.seekTo(startTime, true);
        if (player.playVideo) {
          player.playVideo();
        }
      }
    } catch (err) {
      console.error('Error seeking to new start time:', err);
    }
  }, [startTime]);

  // Flush progress when user leaves the page / switches tabs (critical for resume)
  useEffect(() => {
    const saveProgress = (reason) => {
      try {
        const player = playerRef.current;
        if (!player || !player.getCurrentTime || !player.getDuration) return;

        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        if (!duration || duration <= 0 || !currentTime || currentTime <= 0) return;

        const progress = (currentTime / duration) * 100;

        // Track for open students (playlistId is optional)
        if (isOpenStudent() && finalDbVideoId) {
          trackOpenStudentProgress(currentTime, progress, duration).catch(() => { });
        }

        // Track using new API (intern tracking - playlistId is optional)
        // Ensure finalDbVideoId is a valid integer (database ID), not a YouTube ID string
        const dbVideoIdInt = safeParseInt(finalDbVideoId);
        if (!isOpenStudent() && dbVideoIdInt) {
          api.videoTracking
            .trackProgress(
              dbVideoIdInt,
              playlistId ? parseInt(playlistId) : null,
              Math.round(currentTime),
              progress,
              currentTime
            )
            .catch((err) => {
              console.error('Error tracking video progress:', err);
            });
        }

        // Always log to activity log (this is what student resume reads)
        logActivity('video_progress', {
          videoId: finalVideoId,
          video_id: finalVideoId,
          videoTitle: videoTitle || 'Unknown Video',
          video_title: videoTitle || 'Unknown Video',
          playlistId: playlistId || null,
          playlist_id: playlistId || null,
          playlistTitle: playlistTitle || null,
          playlist_title: playlistTitle || null,
          youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
          youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
          progress: Math.round(progress),
          currentTime: currentTime,
          duration: duration,
          reason,
        });

        lastLoggedTime.current = currentTime;
        lastLoggedProgress.current = progress;
      } catch {
        // ignore
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveProgress('visibility_hidden');
    };

    const onPageHide = () => saveProgress('pagehide');
    const onBeforeUnload = () => saveProgress('beforeunload');

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      // Save once on unmount as well
      saveProgress('unmount');
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [finalVideoId, finalDbVideoId, playlistId, playlistTitle, videoTitle, videoUrl]);

  // Handle player state changes
  const handlePlayerStateChange = (event) => {
    const state = event.data;
    const player = event.target;

    // Video started (playing)
    if (state === window.YT.PlayerState.PLAYING && !progressMilestones.current.started) {
      progressMilestones.current.started = true;

      // Track for open students - Use current time instead of 0
      if (isOpenStudent()) {
        const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
        // Only track if we have a valid time > 1s (to avoid overwriting resume progress with 0)
        // or if we are truly at the start
        if (currentTime > 1 || startTime < 1) {
          trackOpenStudentProgress(currentTime, 0, 0).catch(err => {
            console.error('Error tracking open student video started:', err);
          });
        }
      }

      // Track using new API (for interns)
      const { dbVideoId: currentDbId, playlistId: currentPlId } = trackingRef.current;
      if (!isOpenStudent() && currentPlId && currentDbId) {
        api.videoTracking.trackStarted(parseInt(currentDbId), parseInt(currentPlId)).catch(err => {
          // ...
        });
      }

      // Also log to activity log for backward compatibility
      logActivity('video_start', {
        videoId: finalVideoId,
        // ...
        video_id: finalVideoId,
        videoTitle: videoTitle || 'Unknown Video',
        video_title: videoTitle || 'Unknown Video',
        playlistId: playlistId || null,
        playlist_id: playlistId || null,
        playlistTitle: playlistTitle || null,
        playlist_title: playlistTitle || null,
        youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
        youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
      });
    }

    // Video paused - save current progress
    if (state === window.YT.PlayerState.PAUSED) {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration > 0 && currentTime > 0) {
          const progress = (currentTime / duration) * 100;
          // Only log if significant time has passed (avoid spam)
          if (Math.abs(currentTime - lastLoggedTime.current) > 5) {
            // Track for open students
            if (isOpenStudent() && finalDbVideoId) {
              trackOpenStudentProgress(currentTime, progress, duration).catch(err => {
                console.error('Error tracking open student video progress:', err);
              });
            }

            // Track using new API (intern tracking - playlistId is optional)
            const dbVideoIdInt = safeParseInt(finalDbVideoId);
            if (!isOpenStudent() && dbVideoIdInt) {
              api.videoTracking.trackProgress(
                dbVideoIdInt,
                playlistId ? parseInt(playlistId) : null,
                Math.round(currentTime),
                progress,
                currentTime
              ).catch(err => {
                console.error('Error tracking video progress on pause:', err);
              });
            }

            // Also log to activity log for backward compatibility
            logActivity('video_progress', {
              videoId: finalVideoId,
              video_id: finalVideoId,
              videoTitle: videoTitle || 'Unknown Video',
              video_title: videoTitle || 'Unknown Video',
              playlistId: playlistId || null,
              playlist_id: playlistId || null,
              playlistTitle: playlistTitle || null,
              playlist_title: playlistTitle || null,
              youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              progress: Math.round(progress),
              currentTime: currentTime,
              duration: duration,
            });
            lastLoggedTime.current = currentTime;
            lastLoggedProgress.current = progress;
          }
        }
      } catch (err) {
        console.error('Error logging pause progress:', err);
      }
    }

    // Video ended (completed)
    if (state === window.YT.PlayerState.ENDED && !progressMilestones.current.completed) {
      progressMilestones.current.completed = true;

      // Get video duration before logging
      let videoDuration = 0;
      try {
        if (player && player.getDuration) {
          videoDuration = player.getDuration();
        }
      } catch (err) {
        console.error('Error getting video duration:', err);
      }

      // Track completion for open students (100% progress)
      if (isOpenStudent() && finalDbVideoId) {
        trackOpenStudentProgress(videoDuration, 100, videoDuration).catch(err => {
          console.error('Error tracking open student video completed:', err);
        });
      }

      // Track using new API (intern tracking)
      // Only require finalDbVideoId - playlistId is optional (can be null for standalone videos)
      // Ensure finalDbVideoId is a valid integer (database ID), not a YouTube ID string
      const dbVideoIdInt = safeParseInt(finalDbVideoId);
      if (!isOpenStudent() && dbVideoIdInt) {
        // console.log(`[Video Completion] Tracking completion for video ${dbVideoIdInt}, playlistId: ${playlistId}, duration: ${videoDuration}`);
        api.videoTracking.trackCompleted(
          dbVideoIdInt,
          playlistId ? parseInt(playlistId) : null,
          Math.round(videoDuration)
        ).then(() => {
          // console.log(`[Video Completion] Successfully tracked completion for video ${dbVideoIdInt}`);
        }).catch(err => {
          console.error('[Video Completion] Error tracking video completed:', err);
        });
      } else if (!isOpenStudent() && !dbVideoIdInt) {
        console.warn(`[Video Completion] Cannot track completion - invalid finalDbVideoId: ${finalDbVideoId} (expected integer database ID)`);
      }

      // Also log to activity log for backward compatibility
      logActivity('video_complete', {
        videoId: finalVideoId,
        video_id: finalVideoId,
        videoTitle: videoTitle || 'Unknown Video',
        video_title: videoTitle || 'Unknown Video',
        playlistId: playlistId || null,
        playlist_id: playlistId || null,
        playlistTitle: playlistTitle || null,
        playlist_title: playlistTitle || null,
        youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
        youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
        completed: true,
        progress: 100,
        duration: videoDuration,
        currentTime: videoDuration,
      });

      // Call onVideoEnd callback if provided
      if (onVideoEnd) {
        onVideoEnd();
      }
    }
  };

  // Track progress milestones (25%, 50%, 75%) and save currentTime periodically
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady) return;

    const checkProgress = () => {
      try {
        const player = playerRef.current;
        if (!player || !player.getCurrentTime || !player.getDuration) return;

        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const playerState = player.getPlayerState();

        // Only check progress if video is playing
        if (playerState !== window.YT.PlayerState.PLAYING) return;

        if (duration > 0 && currentTime > 0) {
          const progress = (currentTime / duration) * 100;

          // Log 25% milestone
          if (progress >= 25 && !progressMilestones.current.milestone25) {
            progressMilestones.current.milestone25 = true;
            logActivity('video_progress', {
              videoId: finalVideoId,
              video_id: finalVideoId,
              videoTitle: videoTitle || 'Unknown Video',
              video_title: videoTitle || 'Unknown Video',
              playlistId: playlistId || null,
              playlist_id: playlistId || null,
              playlistTitle: playlistTitle || null,
              playlist_title: playlistTitle || null,
              youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              progress: 25,
              currentTime: currentTime,
              duration: duration,
            });
            lastLoggedTime.current = currentTime;
            lastLoggedProgress.current = progress;
          }

          // Log 50% milestone
          if (progress >= 50 && !progressMilestones.current.milestone50) {
            progressMilestones.current.milestone50 = true;
            logActivity('video_progress', {
              videoId: finalVideoId,
              video_id: finalVideoId,
              videoTitle: videoTitle || 'Unknown Video',
              video_title: videoTitle || 'Unknown Video',
              playlistId: playlistId || null,
              playlist_id: playlistId || null,
              playlistTitle: playlistTitle || null,
              playlist_title: playlistTitle || null,
              youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              progress: 50,
              currentTime: currentTime,
              duration: duration,
            });
            lastLoggedTime.current = currentTime;
            lastLoggedProgress.current = progress;
          }

          // Log 75% milestone
          if (progress >= 75 && !progressMilestones.current.milestone75) {
            progressMilestones.current.milestone75 = true;
            logActivity('video_progress', {
              videoId: finalVideoId,
              video_id: finalVideoId,
              videoTitle: videoTitle || 'Unknown Video',
              video_title: videoTitle || 'Unknown Video',
              playlistId: playlistId || null,
              playlist_id: playlistId || null,
              playlistTitle: playlistTitle || null,
              playlist_title: playlistTitle || null,
              youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              progress: 75,
              currentTime: currentTime,
              duration: duration,
            });
            lastLoggedTime.current = currentTime;
            lastLoggedProgress.current = progress;
          }

          // Save progress every ~5 seconds (for resume functionality)
          // Only log if at least 5 seconds have passed since last log
          if (Math.abs(currentTime - lastLoggedTime.current) >= 5) {
            // Track for open students (requires dbVideoId)
            if (isOpenStudent() && finalDbVideoId) {
              trackOpenStudentProgress(currentTime, progress, duration).catch(err => {
                console.error('Error tracking open student video progress:', err);
              });
            }

            // Track using new API (for interns)
            const { dbVideoId: currentDbId, playlistId: currentPlId } = trackingRef.current;
            if (!isOpenStudent() && currentPlId && currentDbId) {
              api.videoTracking.trackProgress(
                parseInt(currentDbId),
                parseInt(currentPlId),
                Math.round(currentTime),
                progress,
                currentTime
              ).catch(err => {
                console.error('Error tracking video progress:', err);
              });
            }

            // Also log to activity log for backward compatibility
            logActivity('video_progress', {
              videoId: finalVideoId,
              video_id: finalVideoId,
              videoTitle: videoTitle || 'Unknown Video',
              video_title: videoTitle || 'Unknown Video',
              playlistId: playlistId || null,
              playlist_id: playlistId || null,
              playlistTitle: playlistTitle || null,
              playlist_title: playlistTitle || null,
              youtubeUrl: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              youtube_url: videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`,
              progress: Math.round(progress),
              currentTime: currentTime,
              duration: duration,
            });
            lastLoggedTime.current = currentTime;
            lastLoggedProgress.current = progress;
          }
        }
      } catch (err) {
        // Player might not be ready yet, ignore errors
        console.error('Error checking video progress:', err);
      }
    };

    // Check progress every 5 seconds while video is playing
    const progressInterval = setInterval(checkProgress, 5000);

    // Cleanup interval when component unmounts
    return () => {
      clearInterval(progressInterval);
      // Reset tracking on unmount
      progressMilestones.current = {
        started: false,
        completed: false,
        milestone25: false,
        milestone50: false,
        milestone75: false,
      };
      lastLoggedTime.current = 0;
      lastLoggedProgress.current = 0;
    };
  }, [isPlayerReady, finalVideoId, videoTitle, videoUrl, playlistId, playlistTitle]);

  if (!finalVideoId) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg aspect-video">
        <p className="text-gray-500">Invalid video URL or ID</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg aspect-video">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <a
            href={videoUrl || `https://www.youtube.com/watch?v=${finalVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 underline"
          >
            Watch on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="aspect-video w-full bg-black rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />
      {!isPlayerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-2"></div>
            <p className="text-gray-600">Loading video player...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeVideoPlayer;

