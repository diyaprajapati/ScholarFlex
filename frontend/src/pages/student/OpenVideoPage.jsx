import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../config/paths';
import api from '../../services/api';
import StudentSidebar from '../../components/student/StudentSidebar';
import YouTubeVideoPlayer from '../../components/video/YouTubeVideoPlayer';
import { ArrowLeft } from 'lucide-react';

const OpenVideoPage = () => {
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

  // From query params
  const videoUrlParam = searchParams.get('url');
  const playlistId = searchParams.get('playlistId');
  const videoTitleParam = searchParams.get('title') || 'Video';
  const startTimeParam = searchParams.get('startTime');

  const extractVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const fetchOpenVideoProgress = async (dbVideo) => {
    try {
      // If startTime is provided in URL params (from continue watching), use it directly
      // This takes priority over API data
      if (startTimeParam) {
        const time = parseFloat(startTimeParam);
        if (!isNaN(time) && time > 0) {
          setStartTime(time);
          // console.log(`✅ Resuming video from URL param: ${time} seconds`);
          return;
        } else {
          // console.log(`⚠️ Invalid startTime param: ${startTimeParam}`);
        }
      } else {
        // console.log('ℹ️ No startTime param in URL, fetching from API');
      }
      
      // Otherwise, fetch from API
      if (!dbVideo?.id) {
        // console.log('ℹ️ No dbVideo ID, starting from beginning');
        setStartTime(0);
        return;
      }

      const response = await api.openStudent.getVideoProgress(dbVideo.id);
      // console.log('API progress response:', response);
      
      if (response.success && response.progress) {
        const { lastPosition, isCompleted } = response.progress;
        if (!isCompleted && lastPosition && Number(lastPosition) > 0) {
          setStartTime(Number(lastPosition));
          // console.log(`✅ Resuming video from API: ${Number(lastPosition)} seconds`);
        } else {
          // console.log('ℹ️ Video is completed or no lastPosition, starting from beginning');
          setStartTime(0);
        }
      } else {
        // console.log('ℹ️ No progress found in API response, starting from beginning');
        setStartTime(0);
      }
    } catch (err) {
      console.error('❌ Error fetching open student video progress:', err);
      setStartTime(0);
    }
  };

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('open_student_token');
      if (!token) {
        navigate(ROUTES.STUDENT.OPEN.REGISTER, { replace: true });
        return;
      }

      const stored = localStorage.getItem('open_student_data');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          // ignore
        }
      }

      if (!videoUrlParam) {
        setError('Missing video URL.');
        setLoading(false);
        return;
      }

      const decodedUrl = decodeURIComponent(videoUrlParam);
      const decodedTitle = decodeURIComponent(videoTitleParam || 'Video');

      try {
        // If we have a playlistId, fetch playlist details for sidebar + navigation
        if (playlistId) {
          const response = await api.openStudent.getPlaylistById(playlistId);
          if (response.success && response.playlist) {
            const pl = response.playlist;
            setPlaylist(pl);
            const videos = pl.videos || [];
            setPlaylistVideos(videos);

            // Find current video inside playlist by YouTube URL or by extracted ID
            const currentYoutubeId = videoId;
            let index = videos.findIndex((v) => {
              const vId = extractVideoId(v.youtubeUrl);
              return vId === currentYoutubeId;
            });

            if (index < 0) {
              index = videos.findIndex((v) => v.youtubeUrl === decodedUrl);
            }

            const current = index >= 0 ? videos[index] : videos[0];
            const currentVideo = {
              id: current.id,
              title: current.title,
              youtubeUrl: current.youtubeUrl,
            };
            setVideo(currentVideo);
            setCurrentVideoIndex(index >= 0 ? index : 0);

            // Load resume position for this video
            await fetchOpenVideoProgress(currentVideo);
          } else {
            // Fallback: standalone video
            setPlaylist(null);
            setPlaylistVideos([]);
            const standaloneVideo = {
              id: videoId,
              title: decodedTitle,
              youtubeUrl: decodedUrl,
            };
            setVideo(standaloneVideo);
            await fetchOpenVideoProgress(standaloneVideo);
          }
        } else {
          // No playlist context – standalone video
          const standaloneVideo = {
            id: videoId,
            title: decodedTitle,
            youtubeUrl: decodedUrl,
          };
          setVideo(standaloneVideo);
          await fetchOpenVideoProgress(standaloneVideo);
        }
      } catch (err) {
        console.error('Error loading open video data:', err);
        setError(err.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [videoId, videoUrlParam, videoTitleParam, playlistId, navigate]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (playlistId) {
      navigate(ROUTES.STUDENT.OPEN.PLAYLISTS, { replace: true });
    } else {
      navigate(ROUTES.STUDENT.OPEN.DASHBOARD, { replace: true });
    }
  };

  const handleVideoEnd = () => {
    if (playlistVideos.length > 0 && currentVideoIndex < playlistVideos.length - 1) {
      const nextVideo = playlistVideos[currentVideoIndex + 1];
      const nextYoutubeId = extractVideoId(nextVideo.youtubeUrl) || videoId;
      navigate(
        ROUTES.STUDENT.OPEN.VIDEO(nextYoutubeId) +
          `?url=${encodeURIComponent(nextVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(
            nextVideo.title
          )}`
      );
    }
  };

  const handleNextVideo = () => {
    if (playlistVideos.length > 0 && currentVideoIndex < playlistVideos.length - 1) {
      const nextVideo = playlistVideos[currentVideoIndex + 1];
      const nextYoutubeId = extractVideoId(nextVideo.youtubeUrl) || videoId;
      navigate(
        ROUTES.STUDENT.OPEN.VIDEO(nextYoutubeId) +
          `?url=${encodeURIComponent(nextVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(
            nextVideo.title
          )}`
      );
    }
  };

  const handlePreviousVideo = () => {
    if (playlistVideos.length > 0 && currentVideoIndex > 0) {
      const prevVideo = playlistVideos[currentVideoIndex - 1];
      const prevYoutubeId = extractVideoId(prevVideo.youtubeUrl) || videoId;
      navigate(
        ROUTES.STUDENT.OPEN.VIDEO(prevYoutubeId) +
          `?url=${encodeURIComponent(prevVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(
            prevVideo.title
          )}`
      );
    }
  };

  const handleVideoSelect = (selectedVideo, index) => {
    const selectedYoutubeId = extractVideoId(selectedVideo.youtubeUrl) || videoId;
    navigate(
      ROUTES.STUDENT.OPEN.VIDEO(selectedYoutubeId) +
        `?url=${encodeURIComponent(selectedVideo.youtubeUrl)}&playlistId=${playlistId}&title=${encodeURIComponent(
          selectedVideo.title
        )}`
    );
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
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Video not found'}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    );
  }

  const finalVideoId = extractVideoId(video.youtubeUrl) || videoId;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <StudentSidebar
        activeTab="playlists"
        setActiveTab={() => {}}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isIntern={false}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 cursor-pointer"
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

        {/* Video Player + Playlist layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Player - Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <YouTubeVideoPlayer
                    videoId={finalVideoId}
                    dbVideoId={video.id}
                    videoTitle={video.title}
                    videoUrl={video.youtubeUrl}
                    playlistId={playlist?.id || playlistId}
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
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Previous
                      </button>
                      <button
                        onClick={handleNextVideo}
                        disabled={currentVideoIndex === playlistVideos.length - 1}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Next
                        <ArrowLeft className="w-5 h-5 rotate-180" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Sidebar (like YouTube) */}
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
                            index === currentVideoIndex
                              ? 'bg-green-50 border-2 border-green-500'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  index === currentVideoIndex
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium line-clamp-2 ${
                                  index === currentVideoIndex
                                    ? 'text-green-900'
                                    : 'text-gray-900'
                                }`}
                              >
                                {playlistVideo.title}
                              </p>
                            </div>
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

export default OpenVideoPage;


