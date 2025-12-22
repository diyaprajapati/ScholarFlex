import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import api from '../../services/api';
import StudentSidebar from '../../components/student/StudentSidebar';
import { ArrowLeft, Clock, Play, CheckCircle, TrendingUp, Calendar, Video } from 'lucide-react';

const StudentVideoAnalyticsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.videoAnalytics.getStudentAnalytics();
      
      if (response.success) {
        setAnalytics(response.analytics);
      } else {
        setError('Failed to load analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(ROUTES.STUDENT.DASHBOARD)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <StudentSidebar
        activeTab="video-analytics"
        setActiveTab={() => {}}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

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
            <h1 className="text-2xl font-semibold text-gray-900">Video Analytics</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {analytics ? (
            analytics.summary.totalVideosOpened === 0 ? (
              <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">No Video Analytics Yet</h2>
                  <p className="text-gray-600 mb-6">
                    Start watching videos to see your analytics here. Your video progress, watch time, and completion stats will appear once you begin watching.
                  </p>
                  <button
                    onClick={() => navigate(ROUTES.STUDENT.DASHBOARD_TABS.PLAYLISTS)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Browse Playlists
                  </button>
                </div>
              </div>
            ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Videos Opened</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {analytics.summary.totalVideosOpened}
                      </p>
                    </div>
                    <Play className="w-8 h-8 text-indigo-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Videos Watched</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {analytics.summary.totalVideosWatched}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Videos Completed</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {analytics.summary.totalVideosCompleted}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Watch Time</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatTime(analytics.summary.totalWatchTimeSeconds)}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Playlist Analytics */}
              {analytics.playlistAnalytics && analytics.playlistAnalytics.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Playlist Analytics</h2>
                  <div className="space-y-4">
                    {analytics.playlistAnalytics.map((playlist) => (
                      <div key={playlist.playlistId} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{playlist.playlistTitle}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-gray-600">Videos Opened</p>
                            <p className="text-lg font-semibold">{playlist.videosOpened}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Videos Watched</p>
                            <p className="text-lg font-semibold">{playlist.videosWatched}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Videos Completed</p>
                            <p className="text-lg font-semibold">{playlist.videosCompleted}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Watch Time</p>
                            <p className="text-lg font-semibold">{formatTime(playlist.totalWatchTimeSeconds)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Watch Time */}
              {analytics.todayWatchTime && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Today's Watch Time
                  </h2>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Watch Time Today</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {formatTime(analytics.todayWatchTime.seconds)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {analytics.todayWatchTime.minutes.toFixed(2)} minutes
                      </p>
                    </div>
                    <Clock className="w-12 h-12 text-indigo-600" />
                  </div>
                </div>
              )}

              {/* Recent Videos */}
              {analytics.recentVideos && analytics.recentVideos.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Videos</h2>
                  <div className="space-y-2">
                    {analytics.recentVideos.map((video, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{video.videoTitle}</p>
                          <p className="text-sm text-gray-600">{video.playlistTitle}</p>
                        </div>
                        <div className="text-right">
                          {video.isCompleted ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Completed
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600">
                              {typeof video.progressPercent === 'number' 
                                ? video.progressPercent.toFixed(0) 
                                : parseFloat(video.progressPercent || 0).toFixed(0)}% watched
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Video Analytics Yet</h2>
                <p className="text-gray-600 mb-6">
                  Start watching videos to see your analytics here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentVideoAnalyticsPage;

