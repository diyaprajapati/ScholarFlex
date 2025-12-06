import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import api from '../../services/api';
import StudentSidebar from '../../components/student/StudentSidebar';
import DashboardTab from '../../components/student/DashboardTab';
import PlaylistsTab from '../../components/student/PlaylistsTab';
import ActivityTab from '../../components/student/ActivityTab';
import PlaylistModal from '../../components/student/PlaylistModal';
import { Menu } from 'lucide-react';

const StudentDashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard Tab State
  const [continueWatching, setContinueWatching] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recommendedPlaylists, setRecommendedPlaylists] = useState([]);
  const [recommendedTests, setRecommendedTests] = useState([]);
  
  // Playlists Tab State
  const [allPlaylists, setAllPlaylists] = useState([]);
  
  // Activity Tab State
  const [activitySummary, setActivitySummary] = useState(null);
  
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  
  // Playlist Viewer Modal State
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    
    const userData = authService.getUser();
    setUser(userData);
    
    const userRole = authService.getUserRole();
    if (userRole !== 'STUDENT') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }

    if (!userData?.is_selected) {
      navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true });
      return;
    }

    fetchInitialData();
  }, [navigate]);

  // Periodic check for is_selected status changes
  useEffect(() => {
    if (!authService.isAuthenticated() || !authService.isStudent()) {
      return;
    }

    const checkUserStatus = async () => {
      try {
        const response = await api.auth.getCurrentUser();
        if (response.success && response.user) {
          const currentUser = response.user;
          const storedUser = authService.getUser();
          
          // Check if is_selected status has changed
          if (storedUser && storedUser.is_selected !== currentUser.is_selected) {
            // Update user data in localStorage
            authService.updateUser({ is_selected: currentUser.is_selected });
            setUser({ ...storedUser, is_selected: currentUser.is_selected });
            
            // Redirect based on new status
            if (currentUser.is_selected) {
              // Student was selected, redirect to dashboard
              navigate(ROUTES.STUDENT.DASHBOARD, { replace: true });
            } else {
              // Student was deselected, redirect to instructions
              navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true });
            }
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        // Don't redirect on error, just log it
      }
    };

    // Check immediately
    checkUserStatus();

    // Set up interval to check every 5 seconds
    const intervalId = setInterval(checkUserStatus, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [navigate]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to load data');
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const [videosRes, playlistsRes, testsRes] = await Promise.all([
        api.activity.getRecentVideos().catch(() => ({ success: false, videos: [] })),
        api.playlists.getRecommendedPlaylists().catch(() => ({ success: false, playlists: [] })),
        api.studentTests.getAvailable().catch(() => ({ success: false, data: [] })),
      ]);

      if (videosRes.success) {
        setContinueWatching(videosRes.videos || []);
        setRecentActivity(videosRes.videos.slice(0, 5) || []);
      }

      if (playlistsRes.success) {
        setRecommendedPlaylists(playlistsRes.playlists || []);
      }

      if (testsRes.success) {
        setRecommendedTests(testsRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchPlaylistsData = async () => {
    try {
      setLoadingPlaylists(true);
      const [recommendedRes, allRes] = await Promise.all([
        api.playlists.getRecommendedPlaylists().catch(() => ({ success: false, playlists: [] })),
        api.playlists.getStudentPlaylists().catch(() => ({ success: false, playlists: [] })),
      ]);

      if (recommendedRes.success) {
        setRecommendedPlaylists(recommendedRes.playlists || []);
      }

      if (allRes.success) {
        setAllPlaylists(allRes.playlists || []);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const fetchActivityData = async () => {
    try {
      setLoadingActivity(true);
      const response = await api.activity.getSummary();
      if (response.success) {
        setActivitySummary(response.summary);
      }
    } catch (err) {
      console.error('Error fetching activity data:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'playlists' && allPlaylists.length === 0) {
      fetchPlaylistsData();
    } else if (activeTab === 'activity' && !activitySummary) {
      fetchActivityData();
    }
  }, [activeTab]);

  const extractVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getThumbnailUrl = (youtubeUrl) => {
    const videoId = extractVideoId(youtubeUrl);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    setIsPlaylistModalOpen(true);
    
    // Log activity when playlist is opened
    if (playlist.id) {
      api.activity.log('PLAYLIST_OPENED', {
        playlist_id: playlist.id,
        playlist_title: playlist.title,
      }).catch(err => console.error('Error logging activity:', err));
    }
  };

  const handleVideoClick = (video) => {
    if (video.youtubeUrl) {
      window.open(video.youtubeUrl, '_blank');
      
      // Log activity when video is clicked
      if (selectedPlaylist) {
        api.activity.log('VIDEO_CLICKED', {
          video_id: video.id,
          video_title: video.title,
          playlist_id: selectedPlaylist.id,
          playlist_title: selectedPlaylist.title,
          youtube_url: video.youtubeUrl,
        }).catch(err => console.error('Error logging activity:', err));
      }
    }
  };

  const handleCloseModal = () => {
    setIsPlaylistModalOpen(false);
    setSelectedPlaylist(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <StudentSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top Header - Mobile */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 lg:static">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Student Portal</h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Welcome back, {user?.full_name || user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  authService.logout();
                  navigate(ROUTES.LOGIN);
                }}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              loadingDashboard={loadingDashboard}
              continueWatching={continueWatching}
              recentActivity={recentActivity}
              recommendedPlaylists={recommendedPlaylists}
              recommendedTests={recommendedTests}
              getThumbnailUrl={getThumbnailUrl}
              handlePlaylistClick={handlePlaylistClick}
            />
          )}

          {/* Playlists Tab */}
          {activeTab === 'playlists' && (
            <PlaylistsTab
              loadingPlaylists={loadingPlaylists}
              recommendedPlaylists={recommendedPlaylists}
              allPlaylists={allPlaylists}
              getThumbnailUrl={getThumbnailUrl}
              handlePlaylistClick={handlePlaylistClick}
            />
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <ActivityTab
              loadingActivity={loadingActivity}
              activitySummary={activitySummary}
              formatTime={formatTime}
            />
          )}
        </main>
      </div>

      {/* Playlist Viewer Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        selectedPlaylist={selectedPlaylist}
        onClose={handleCloseModal}
        getThumbnailUrl={getThumbnailUrl}
        handleVideoClick={handleVideoClick}
      />
    </div>
  );
};

export default StudentDashboardPage;
