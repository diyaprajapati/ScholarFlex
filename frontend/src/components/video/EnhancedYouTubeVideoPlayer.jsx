import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../services/api';

/**
 * Enhanced YouTube Video Player with Comprehensive Event Tracking
 * 
 * Tracks:
 * - Playlist opens
 * - Video opens
 * - Play, pause, resume
 * - Seek forward/backward
 * - Progress updates
 * - Completion
 * - Exit before completion
 * - Tab visibility changes
 * - Accurate watch time calculation
 */
const EnhancedYouTubeVideoPlayer = ({ 
  videoId, 
  videoTitle, 
  videoUrl, 
  playlistId, 
  playlistTitle, 
  onVideoEnd, 
  startTime = 0,
  dbVideoId = null,
  onPlaylistOpened = null 
}) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [error, setError] = useState(null);
  
  // Session management
  const sessionIdRef = useRef(null);
  const sessionStartedRef = useRef(false);
  
  // Playback state tracking
  const playbackStateRef = useRef({
    isPlaying: false,
    lastPosition: 0,
    lastTimestamp: null,
    videoDuration: 0,
    playbackRate: 1.0,
  });

  // Event queue for batch sending
  const eventQueueRef = useRef([]);
  const progressIntervalRef = useRef(null);
  const lastProgressSentRef = useRef(0);

  // Extract video ID from URL if not provided directly
  const extractVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const finalVideoId = videoId || extractVideoId(videoUrl);
  const finalDbVideoId = dbVideoId || videoId;

  // Track playlist opened
  useEffect(() => {
    if (playlistId && onPlaylistOpened) {
      api.enhancedVideoTracking?.trackPlaylistOpened(parseInt(playlistId)).catch(err => {
        console.error('Error tracking playlist opened:', err);
      });
      if (onPlaylistOpened) onPlaylistOpened();
    }
  }, [playlistId, onPlaylistOpened]);

  // Start session when video opens
  useEffect(() => {
    if (playlistId && finalDbVideoId && !sessionStartedRef.current) {
      startVideoSession();
    }
  }, [playlistId, finalDbVideoId]);

  // Track tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEvent('TAB_HIDDEN');
      } else {
        trackEvent('TAB_VISIBLE');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // End session on unmount
  useEffect(() => {
    return () => {
      endSession('exited');
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Start video session
  const startVideoSession = async () => {
    if (!api.enhancedVideoTracking) {
      console.warn('Enhanced video tracking not available');
      return;
    }

    try {
      const response = await api.enhancedVideoTracking.startSession(
        parseInt(finalDbVideoId),
        parseInt(playlistId)
      );
      
      if (response.success && response.sessionId) {
        sessionIdRef.current = response.sessionId;
        sessionStartedRef.current = true;
        // console.log('Video session started:', response.sessionId);
      }
    } catch (err) {
      console.error('Error starting video session:', err);
    }
  };

  // Track event
  const trackEvent = useCallback(async (eventType, additionalData = {}) => {
    if (!sessionIdRef.current || !api.enhancedVideoTracking) {
      return;
    }

    try {
      const player = playerRef.current;
      if (!player) return;

      const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
      const duration = player.getDuration ? player.getDuration() : playbackStateRef.current.videoDuration;
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
      const playbackRate = player.getPlaybackRate ? player.getPlaybackRate() : 1.0;

      const eventData = {
        eventType,
        videoPosition: currentTime,
        videoDuration: duration,
        progressPercent: progress,
        playbackRate: playbackRate,
        ...additionalData,
      };

      // Queue event for batch sending (except critical events)
      if (eventType === 'PROGRESS') {
        // Throttle progress events
        const now = Date.now();
        if (now - lastProgressSentRef.current < 10000) { // 10 seconds
          return;
        }
        lastProgressSentRef.current = now;
      }

      // Send event immediately for critical events
      if (['PLAY', 'PAUSE', 'RESUME', 'SEEK', 'COMPLETE', 'EXIT', 'TAB_HIDDEN', 'TAB_VISIBLE'].includes(eventType)) {
        await api.enhancedVideoTracking.trackEvent(sessionIdRef.current, eventData);
      } else {
        // Queue for batch sending
        eventQueueRef.current.push(eventData);
      }

      // Update playback state
      playbackStateRef.current = {
        isPlaying: eventType === 'PLAY' || eventType === 'RESUME' || eventType === 'TAB_VISIBLE',
        lastPosition: currentTime,
        lastTimestamp: new Date(),
        videoDuration: duration,
        playbackRate: playbackRate,
      };
    } catch (err) {
      console.error(`Error tracking ${eventType} event:`, err);
    }
  }, [sessionIdRef.current]);

  // Batch send queued events
  const flushEventQueue = useCallback(async () => {
    if (eventQueueRef.current.length === 0 || !sessionIdRef.current) return;

    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];

    for (const eventData of events) {
      try {
        await api.enhancedVideoTracking.trackEvent(sessionIdRef.current, eventData);
      } catch (err) {
        console.error('Error flushing event queue:', err);
        // Re-queue failed events
        eventQueueRef.current.push(eventData);
      }
    }
  }, [sessionIdRef.current]);

  // End session
  const endSession = async (exitReason = 'exited') => {
    if (!sessionIdRef.current || !api.enhancedVideoTracking) {
      return;
    }

    try {
      // Flush any pending events
      await flushEventQueue();

      // Send final progress update
      const player = playerRef.current;
      if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration ? player.getDuration() : 0;
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        await api.enhancedVideoTracking.trackEvent(sessionIdRef.current, {
          eventType: 'EXIT',
          videoPosition: currentTime,
          videoDuration: duration,
          progressPercent: progress,
          playbackRate: 1.0,
        });
      }

      // End session
      await api.enhancedVideoTracking.endSession(sessionIdRef.current, exitReason);
      sessionIdRef.current = null;
      sessionStartedRef.current = false;
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  // Load YouTube IFrame Player API (same as before)
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsPlayerReady(true);
      return;
    }

    // ... (YouTube API loading code from original component)
    // [Include the YouTube API loading code from the original component]
    
    const scriptUrl = 'https://www.youtube.com/s/player/217a23a9/www-widgetapi.vflset/www-widgetapi.js';
    let finalScriptUrl = scriptUrl;
    
    try {
      const ttPolicy = window.trustedTypes?.createPolicy('youtube-widget-api', {
        createScriptURL: (x) => x,
      });
      if (ttPolicy) {
        finalScriptUrl = ttPolicy.createScriptURL(scriptUrl);
      }
    } catch (e) {}

    if (!window.YT) {
      window.YT = { loading: 0, loaded: 0 };
    }
    if (!window.YTConfig) {
      window.YTConfig = { host: 'https://www.youtube.com' };
    }

    if (!window.YT.loading) {
      window.YT.loading = 1;
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

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.id = 'www-widgetapi-script';
      script.src = finalScriptUrl;
      script.async = true;

      script.onload = () => {
        setIsPlayerReady(true);
      };

      script.onerror = () => {
        setError('Failed to load YouTube IFrame Player API');
        setIsPlayerReady(false);
      };

      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.body.appendChild(script);
      }
    } else if (window.YT.loaded) {
      setIsPlayerReady(true);
    } else {
      window.YT.ready(() => {
        setIsPlayerReady(true);
      });
    }
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isPlayerReady || !finalVideoId || !containerRef.current) return;

    try {
      // Destroy existing player if it exists
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying existing player:', e);
        }
        playerRef.current = null;
      }

      const playerVars = {
        enablejsapi: 1,
        origin: window.location.origin,
        rel: 0,
        modestbranding: 1,
        autoplay: 0, // Don't autoplay - let user control
      };
      
      // Use start parameter for more reliable resume (in seconds)
      // This is the PRIMARY method - YouTube will start the video at this time
      if (startTime > 0) {
        playerVars.start = Math.floor(startTime);
        // console.log(`🎬 Setting YouTube player start time to ${playerVars.start} seconds (PRIMARY METHOD)`);
      }
      
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: finalVideoId,
        playerVars: playerVars,
        events: {
          onReady: (event) => {
            // console.log('✅ YouTube player ready, startTime:', startTime);
            const player = event.target;
            
            // BACKUP METHOD: Also seek to startTime if provided
            // This ensures we seek even if start parameter didn't work perfectly
            if (startTime > 0 && player && player.seekTo) {
              let seekAttempts = 0;
              const maxSeekAttempts = 5;
              
              const seekToStart = () => {
                try {
                  seekAttempts++;
                  const currentTime = player.getCurrentTime();
                  const timeDiff = Math.abs(currentTime - startTime);
                  
                  console.log(`Seek attempt ${seekAttempts}: current=${currentTime.toFixed(1)}s, target=${startTime}s, diff=${timeDiff.toFixed(1)}s`);
                  
                  // Only seek if we're not already at the right position (within 1 second)
                  if (timeDiff > 1 && seekAttempts <= maxSeekAttempts) {
                    player.seekTo(startTime, true);
                    // console.log(`✅ Seeking to ${startTime} seconds (backup method, attempt ${seekAttempts})`);
                    
                    // Try again after a delay if still not at correct position
                    if (seekAttempts < maxSeekAttempts) {
                      setTimeout(seekToStart, 1000 * seekAttempts);
                    }
                  } else if (timeDiff <= 1) {
                    // console.log(`✅ Video is at correct position (${currentTime.toFixed(1)}s)`);
                  }
                } catch (err) {
                  console.error('Error seeking to start time:', err);
                  if (seekAttempts < maxSeekAttempts) {
                    setTimeout(seekToStart, 1000 * seekAttempts);
                  }
                }
              };
              
              // Start seeking attempts with delays: 500ms, 1.5s, 3s, 5s, 7s
              setTimeout(seekToStart, 500);
              setTimeout(seekToStart, 1500);
              setTimeout(seekToStart, 3000);
              setTimeout(seekToStart, 5000);
              setTimeout(seekToStart, 7000);
            } else if (startTime === 0) {
              // console.log('ℹ️ No startTime provided, video will start from beginning');
            }

            // Get initial video duration
            setTimeout(() => {
              try {
                const duration = player.getDuration();
                if (duration) {
                  playbackStateRef.current.videoDuration = duration;
                }
              } catch (err) {
                console.error('Error getting video duration:', err);
              }
            }, 1000);
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

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }
    };
  }, [isPlayerReady, finalVideoId, startTime]);

  // Handle player state changes
  const handlePlayerStateChange = (event) => {
    const state = event.data;
    const player = event.target;

    if (state === window.YT.PlayerState.PLAYING) {
      const wasPaused = playbackStateRef.current.isPlaying === false;
      
      if (wasPaused) {
        // Resuming from pause
        trackEvent('RESUME');
      } else {
        // First play
        trackEvent('PLAY');
      }

      // Start progress tracking interval
      if (!progressIntervalRef.current) {
        progressIntervalRef.current = setInterval(() => {
          if (playbackStateRef.current.isPlaying) {
            trackEvent('PROGRESS');
          }
        }, 10000); // Every 10 seconds
      }
    } else if (state === window.YT.PlayerState.PAUSED) {
      trackEvent('PAUSE');
      
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    } else if (state === window.YT.PlayerState.ENDED) {
      trackEvent('COMPLETE');
      endSession('completed');
      
      if (onVideoEnd) {
        onVideoEnd();
      }
    } else if (state === window.YT.PlayerState.BUFFERING) {
      // Video is buffering - could track this if needed
    }
  };

  // Track seek events (monitor position changes)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    let lastKnownPosition = startTime;
    const seekCheckInterval = setInterval(() => {
      try {
        const player = playerRef.current;
        if (!player || !player.getCurrentTime) return;

        const currentPosition = player.getCurrentTime();
        const positionDiff = Math.abs(currentPosition - lastKnownPosition);

        // Detect seek (position change > 2 seconds when not playing or large jump)
        if (!playbackStateRef.current.isPlaying && positionDiff > 2) {
          trackEvent('SEEK', {
            seekFrom: lastKnownPosition,
            seekTo: currentPosition,
          });
        }

        lastKnownPosition = currentPosition;
      } catch (err) {
        // Ignore errors
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(seekCheckInterval);
    };
  }, [isPlayerReady, trackEvent]);

  // Flush event queue periodically
  useEffect(() => {
    const flushInterval = setInterval(() => {
      flushEventQueue();
    }, 5000); // Flush every 5 seconds

    return () => {
      clearInterval(flushInterval);
      flushEventQueue(); // Final flush
    };
  }, [flushEventQueue]);

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

export default EnhancedYouTubeVideoPlayer;

