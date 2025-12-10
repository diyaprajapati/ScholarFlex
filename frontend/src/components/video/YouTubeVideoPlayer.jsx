import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

/**
 * YouTube Video Player Component with Activity Tracking
 * 
 * Features:
 * - Embeds YouTube videos using IFrame API
 * - Tracks video start, completion, and progress milestones (25%, 50%, 75%)
 * - Logs activities to backend
 */
const YouTubeVideoPlayer = ({ videoId, videoTitle, videoUrl, playlistId, playlistTitle, onVideoEnd, startTime = 0 }) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [error, setError] = useState(null);
  
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

  // Log activity to backend
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

  // Initialize player when API is ready
  useEffect(() => {
    if (!isPlayerReady || !finalVideoId || !containerRef.current) return;

    // Initialize YouTube player
    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: finalVideoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            console.log('YouTube player ready');
            const player = event.target;
            
            // Seek to startTime if provided (for resuming playback)
            // Wait a bit for video to load before seeking
            if (startTime > 0 && player && player.seekTo) {
              // Use setTimeout to ensure video metadata is loaded
              setTimeout(() => {
                try {
                  player.seekTo(startTime, true);
                  console.log(`Seeking to ${startTime} seconds`);
                } catch (err) {
                  console.error('Error seeking to start time:', err);
                }
              }, 500);
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
  }, [isPlayerReady, finalVideoId, startTime]);

  // Handle player state changes
  const handlePlayerStateChange = (event) => {
    const state = event.data;
    const player = event.target;

    // Video started (playing)
    if (state === window.YT.PlayerState.PLAYING && !progressMilestones.current.started) {
      progressMilestones.current.started = true;
      logActivity('video_start', {
        videoId: finalVideoId,
        video_id: finalVideoId, // Also include snake_case for compatibility
        videoTitle: videoTitle || 'Unknown Video',
        video_title: videoTitle || 'Unknown Video', // Also include snake_case for compatibility
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
      
      logActivity('video_complete', {
        videoId: finalVideoId,
        video_id: finalVideoId, // Also include snake_case for compatibility
        videoTitle: videoTitle || 'Unknown Video',
        video_title: videoTitle || 'Unknown Video', // Also include snake_case for compatibility
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

          // Save progress every 10 seconds (for resume functionality)
          // Only log if at least 10 seconds have passed since last log
          if (Math.abs(currentTime - lastLoggedTime.current) >= 10) {
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

    // Check progress every 10 seconds while video is playing
    const progressInterval = setInterval(checkProgress, 10000);

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

