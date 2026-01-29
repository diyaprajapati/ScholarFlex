import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../config/paths';
import api from '../../services/api';
import StudentSidebar from '../../components/student/StudentSidebar';
import DashboardTab from '../../components/student/DashboardTab';
import PlaylistsTab from '../../components/student/PlaylistsTab';
import PlaylistModal from '../../components/student/PlaylistModal';
import LockedFeatureModal from '../../components/student/LockedFeatureModal';
import { Menu } from 'lucide-react';

const OpenStudentDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isIntern] = useState(false); // Open students are not interns

  // Determine active tab from URL
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    console.log('Current path:', path, 'Checking against:', ROUTES.STUDENT.OPEN.PLAYLISTS);
    if (path === ROUTES.STUDENT.OPEN.PLAYLISTS || path === ROUTES.STUDENT.DASHBOARD_TABS.PLAYLISTS) {
      console.log('Returning playlists tab');
      return 'playlists';
    }
    console.log('Returning dashboard tab');
    return 'dashboard'; // Default to dashboard
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromPath());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLockedModal, setShowLockedModal] = useState(false);

  // Dashboard Tab State
  const [continueWatching, setContinueWatching] = useState([]);

  // Playlists Tab State
  const [allPlaylists, setAllPlaylists] = useState([]);

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  // Playlist Viewer Modal State
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  useEffect(() => {
    // Check if open student session exists
    const token = localStorage.getItem('open_student_token');
    if (!token) {
      // No session, redirect to registration
      navigate(ROUTES.STUDENT.OPEN.REGISTER, { replace: true });
      return;
    }

    fetchCurrentStudent();
    fetchInitialData();

    // Set active tab based on current URL
    setActiveTab(getActiveTabFromPath());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const fetchCurrentStudent = async () => {
    try {
      const response = await api.openStudent.getCurrent();
      if (response.success && response.student) {
        setUser(response.student);
      }
    } catch (error) {
      console.error('Error fetching current student:', error);
      // If token is invalid, redirect to registration
      if (error.status === 401) {
        localStorage.removeItem('open_student_token');
        localStorage.removeItem('open_student_data');
        navigate(ROUTES.STUDENT.OPEN.REGISTER, { replace: true });
      }
    }
  };

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
      const response = await api.openStudent.getDashboard();

      if (response.success) {
        const items = response.dashboard?.continueWatching || [];
        console.log('Open dashboard continueWatching:', items);
        console.log('First item details:', items[0] ? {
          id: items[0].id,
          videoTitle: items[0].videoTitle,
          progress: items[0].progress,
          progressPercent: items[0].progressPercent,
          lastPosition: items[0].lastPosition,
        } : 'No items');
        setContinueWatching(items);
      } else {
        console.error('Failed to fetch open dashboard:', response.message);
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
      setError(''); // Clear previous errors
      const response = await api.openStudent.getPlaylists();

      console.log('Playlists API response:', response);

      if (response.success) {
        const playlists = response.playlists || [];
        console.log('Setting playlists:', playlists.length, 'playlists found');
        setAllPlaylists(playlists);
      } else {
        console.error('Failed to fetch playlists:', response.message);
        setError(response.message || 'Failed to load playlists');
        setAllPlaylists([]);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError(err.message || 'Failed to load playlists');
      setAllPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'playlists') {
      fetchPlaylistsData();
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
    // Use i.ytimg.com (more reliable) and a higher quality default thumbnail
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    setIsPlaylistModalOpen(true);
  };

  const handleVideoClick = (video) => {
    let youtubeUrl = video.youtubeUrl;
    if (!youtubeUrl && video.videoId) {
      youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    }

    if (!youtubeUrl) {
      console.error('Cannot open video: missing YouTube URL', video);
      return;
    }

    try {
      const videoUrl = encodeURIComponent(youtubeUrl);
      const title = encodeURIComponent(video.videoTitle || video.title || 'Video');
      const youtubeVideoId = extractVideoId(youtubeUrl);

      if (!youtubeVideoId) {
        console.error('Cannot extract YouTube video ID from URL:', youtubeUrl);
        return;
      }

      // Get lastPosition from video data (for continue watching)
      const lastPosition = video.lastPosition !== undefined && video.lastPosition !== null
        ? Number(video.lastPosition)
        : (video.currentTime !== undefined && video.currentTime !== null
          ? Number(video.currentTime)
          : 0);

      // ALWAYS add startTime param if we have any position data
      let startTimeParam = '';
      if (lastPosition > 0) {
        const startTime = Math.floor(lastPosition);
        startTimeParam = `&startTime=${startTime}`;
      }

      // Add dbVideoId to ensure tracking works correctly with integer IDs
      const dbVideoIdParam = video.id ? `&dbVideoId=${video.id}` : '';

      let navigationPath = '';
      // For open students, navigate to open video route with same UI
      if (!isIntern) {
        if (selectedPlaylist) {
          navigationPath = ROUTES.STUDENT.OPEN.VIDEO(youtubeVideoId) + `?url=${videoUrl}&playlistId=${selectedPlaylist.id}&title=${title}${startTimeParam}${dbVideoIdParam}`;
        } else if (video.playlistId) {
          navigationPath = ROUTES.STUDENT.OPEN.VIDEO(youtubeVideoId) + `?url=${videoUrl}&playlistId=${video.playlistId}&title=${title}${startTimeParam}${dbVideoIdParam}`;
        } else {
          navigationPath = ROUTES.STUDENT.OPEN.VIDEO(youtubeVideoId) + `?url=${videoUrl}&title=${title}${startTimeParam}${dbVideoIdParam}`;
        }
      } else {
        // Fallback for intern context (shouldn't normally be used on open dashboard)
        if (selectedPlaylist) {
          navigationPath = `/student/video/${youtubeVideoId}?url=${videoUrl}&playlistId=${selectedPlaylist.id}&title=${title}${startTimeParam}`;
        } else if (video.playlistId) {
          navigationPath = `/student/video/${youtubeVideoId}?url=${videoUrl}&playlistId=${video.playlistId}&title=${title}${startTimeParam}`;
        } else {
          navigationPath = `/student/video/${youtubeVideoId}?url=${videoUrl}&title=${title}${startTimeParam}`;
        }
      }

      navigate(navigationPath);
    } catch (error) {
      console.error('Error navigating to video:', error);
      window.open(youtubeUrl, '_blank');
    }
  };

  const handleCloseModal = () => {
    setIsPlaylistModalOpen(false);
    setSelectedPlaylist(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('open_student_token');
    localStorage.removeItem('open_student_data');
    api.openStudent.logout().catch(() => { }); // Fire and forget
    navigate(ROUTES.LANDING, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-green-600 border-t-transparent mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading...</p>
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
        isIntern={isIntern}
        onLockedTabClick={() => setShowLockedModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full lg:ml-64">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 lg:static">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0"
                  aria-label="Toggle menu"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                    Student Portal
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">
                    Welcome, {user?.name || user?.email || 'Student'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 sm:space-y-8">
              <DashboardTab
                loadingDashboard={loadingDashboard}
                continueWatching={continueWatching}
                recentActivity={[]} // No recent activity for open students
                recommendedPlaylists={[]} // No recommendations for open students
                recommendedTests={[]} // No tests for open students
                getThumbnailUrl={getThumbnailUrl}
                handlePlaylistClick={handlePlaylistClick}
                handleVideoClick={handleVideoClick}
              />
            </div>
          )}

          {/* Playlists Tab */}
          {activeTab === 'playlists' && (
            <div className="space-y-6 sm:space-y-8">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm sm:text-base">
                  {error}
                </div>
              )}
              <PlaylistsTab
                loadingPlaylists={loadingPlaylists}
                recommendedPlaylists={[]} // No recommendations for open students
                allPlaylists={allPlaylists || []}
                getThumbnailUrl={getThumbnailUrl}
                handlePlaylistClick={handlePlaylistClick}
              />
            </div>
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

      {/* Locked Feature Modal */}
      <LockedFeatureModal
        isOpen={showLockedModal}
        onClose={() => setShowLockedModal(false)}
      />
    </div>
  );
};

export default OpenStudentDashboardPage;

