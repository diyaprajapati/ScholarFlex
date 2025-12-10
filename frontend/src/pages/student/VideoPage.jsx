import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import api from '../../services/api';
import StudentSidebar from '../../components/student/StudentSidebar';
import YouTubeVideoPlayer from '../../components/video/YouTubeVideoPlayer';
import { ArrowLeft, Play } from 'lucide-react';

const VideoPage = () => {
  const navigate = useNavigate();
  const { videoId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [video, setVideo] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [playlistVideos, setPlaylistVideos] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [startTime, setStartTime] = useState(0);

  // Get video info from URL params
  const videoUrl = searchParams.get('url');
  const playlistId = searchParams.get('playlistId');
  const videoTitle = searchParams.get('title') || 'Video';

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    const userData = authService.getUser();
    setUser(userData);

    if (userData?.role !== 'STUDENT') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }

    fetchVideoData();
  }, [videoId, videoUrl, playlistId]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all playlists to search for the video
      const response = await api.playlists.getStudentPlaylists();
      
      if (!response.success) {
        setError('Failed to load playlists');
        return;
      }

      const allPlaylists = response.playlists || [];
      let foundVideo = null;
      let foundPlaylist = null;
      let foundVideoIndex = -1;

      // If playlistId is provided, search in that specific playlist
      if (playlistId) {
        foundPlaylist = allPlaylists.find(p => p.id === parseInt(playlistId));
        if (foundPlaylist) {
          setPlaylist(foundPlaylist);
          setPlaylistVideos(foundPlaylist.videos || []);
          
          // Find current video by database ID or YouTube URL
          foundVideoIndex = foundPlaylist.videos.findIndex(
            v => v.id === parseInt(videoId) || v.youtubeUrl === decodeURIComponent(videoUrl || '')
          );
          if (foundVideoIndex >= 0) {
            foundVideo = foundPlaylist.videos[foundVideoIndex];
          }
        }
      } else if (videoUrl) {
        // No playlistId provided - search across all playlists for the video
        const decodedVideoUrl = decodeURIComponent(videoUrl);
        
        for (const playlist of allPlaylists) {
          const videoIndex = playlist.videos.findIndex(
            v => v.youtubeUrl === decodedVideoUrl || v.id === parseInt(videoId)
          );
          if (videoIndex >= 0) {
            foundPlaylist = playlist;
            foundVideo = playlist.videos[videoIndex];
            foundVideoIndex = videoIndex;
            setPlaylist(playlist);
            setPlaylistVideos(playlist.videos || []);
            break;
          }
        }
        
        // If video not found in any playlist, create a standalone video object
        if (!foundVideo) {
          const standaloneVideo = {
            id: videoId,
            title: decodeURIComponent(videoTitle || 'Video'),
            youtubeUrl: decodedVideoUrl,
          };
          setVideo(standaloneVideo);
          await fetchVideoProgress(standaloneVideo);
          return;
        }
      } else {
        setError('Video URL or playlist information is required');
        return;
      }

      // Set the found video
      if (foundVideo) {
        setVideo(foundVideo);
        setCurrentVideoIndex(foundVideoIndex);
        
        // Fetch saved progress for this video
        await fetchVideoProgress(foundVideo);
      } else if (foundPlaylist && foundPlaylist.videos.length > 0) {
        // Fallback: use first video in playlist
        setVideo(foundPlaylist.videos[0]);
        setCurrentVideoIndex(0);
        await fetchVideoProgress(foundPlaylist.videos[0]);
      } else {
        setError('Video not found');
      }
    } catch (err) {
      console.error('Error fetching video data:', err);
      setError(err.message || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const fetchVideoProgress = async (video) => {
    try {
      const videoId = extractVideoId(video.youtubeUrl);
      const response = await api.activity.getVideoProgress(videoId, video.youtubeUrl);
      
      if (response.success && response.currentTime > 0) {
        // Only resume if video is not completed (progress < 100)
        if (response.progress < 100) {
          setStartTime(response.currentTime);
          console.log(`Resuming video from ${response.currentTime} seconds (${response.progress}% progress)`);
        } else {
          setStartTime(0);
        }
      } else {
        setStartTime(0);
      }
    } catch (err) {
      console.error('Error fetching video progress:', err);
      setStartTime(0);
    }
  };

  const handleVideoEnd = () => {
    // Auto-play next video in playlist if available
    if (playlistVideos.length > 0 && currentVideoIndex < playlistVideos.length - 1) {
      const nextVideo = playlistVideos[currentVideoIndex + 1];
      navigate(`/student/video/${nextVideo.id}?url=${encodeURIComponent(nextVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(nextVideo.title)}`);
    }
  };

  const handleNextVideo = () => {
    if (playlistVideos.length > 0 && currentVideoIndex < playlistVideos.length - 1) {
      const nextVideo = playlistVideos[currentVideoIndex + 1];
      navigate(`/student/video/${nextVideo.id}?url=${encodeURIComponent(nextVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(nextVideo.title)}`);
    }
  };

  const handlePreviousVideo = () => {
    if (playlistVideos.length > 0 && currentVideoIndex > 0) {
      const prevVideo = playlistVideos[currentVideoIndex - 1];
      navigate(`/student/video/${prevVideo.id}?url=${encodeURIComponent(prevVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(prevVideo.title)}`);
    }
  };

  const handleVideoSelect = (selectedVideo, index) => {
    navigate(`/student/video/${selectedVideo.id}?url=${encodeURIComponent(selectedVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(selectedVideo.title)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Video not found'}</p>
          <button
            onClick={() => navigate(ROUTES.STUDENT.DASHBOARD)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const finalVideoId = extractVideoId(video.youtubeUrl);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <StudentSidebar
        activeTab=""
        setActiveTab={() => {}}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(ROUTES.STUDENT.DASHBOARD)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                {video.title}
              </h1>
              {playlist && (
                <p className="text-sm text-gray-500 mt-1">
                  {playlist.title} • Video {currentVideoIndex + 1} of {playlistVideos.length}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Video Player Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Player - Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <YouTubeVideoPlayer
                    videoId={finalVideoId}
                    videoTitle={video.title}
                    videoUrl={video.youtubeUrl}
                    playlistId={playlist?.id}
                    playlistTitle={playlist?.title}
                    onVideoEnd={handleVideoEnd}
                    startTime={startTime}
                  />
                  
                  {/* Video Info */}
                  <div className="mt-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{video.title}</h2>
                    {playlist && playlist.description && (
                      <p className="text-gray-600 mb-4">{playlist.description}</p>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  {playlistVideos.length > 1 && (
                    <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={handlePreviousVideo}
                        disabled={currentVideoIndex === 0}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Previous
                      </button>
                      <button
                        onClick={handleNextVideo}
                        disabled={currentVideoIndex === playlistVideos.length - 1}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Next
                        <ArrowLeft className="w-5 h-5 rotate-180" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Sidebar */}
              {playlist && playlistVideos.length > 0 && (
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Playlist ({playlistVideos.length} videos)
                    </h3>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {playlistVideos.map((playlistVideo, index) => (
                        <div
                          key={playlistVideo.id}
                          onClick={() => handleVideoSelect(playlistVideo, index)}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            playlistVideo.id === video.id
                              ? 'bg-green-50 border-2 border-green-500'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                playlistVideo.id === video.id
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium line-clamp-2 ${
                                playlistVideo.id === video.id
                                  ? 'text-green-900'
                                  : 'text-gray-900'
                              }`}>
                                {playlistVideo.title}
                              </p>
                              {playlistVideo.id === video.id && (
                                <p className="text-xs text-green-600 mt-1">Now Playing</p>
                              )}
                            </div>
                            {playlistVideo.id === video.id && (
                              <Play className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;

