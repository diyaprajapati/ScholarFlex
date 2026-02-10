import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import api from '../../services/api';
import { useStudentLayout } from '../../contexts/StudentLayoutContext';
import DashboardTab from '../../components/student/DashboardTab';
import PlaylistsTab from '../../components/student/PlaylistsTab';
import ActivityTab from '../../components/student/ActivityTab';
import NOCTab from '../../components/student/NOCTab';
import InternshipTab from '../../components/student/InternshipTab';
import PlaylistModal from '../../components/student/PlaylistModal';
import TimeTracking from '../../components/student/TimeTracking';
import { Menu } from 'lucide-react';

const DASHBOARD_TAB_IDS = ['dashboard', 'playlists', 'activity', 'internship', 'noc'];

const StudentDashboardPage = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const { setSidebarOpen } = useStudentLayout();
  const [user, setUser] = useState(null);
  const isOpenStudent = authService.isOpenStudent();

  const activeTab = DASHBOARD_TAB_IDS.includes(tab) ? tab : 'dashboard';

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
    // Handle open students
    if (isOpenStudent) {
      const token = localStorage.getItem('open_student_token');
      if (!token) {
        navigate(ROUTES.STUDENT.OPEN.REGISTER, { replace: true });
        return;
      }
      fetchCurrentStudent();
      fetchInitialData();
      return;
    }
    
    // Handle regular students
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isOpenStudent]);

  // Fetch current student for open students
  const fetchCurrentStudent = async () => {
    try {
      const response = await api.openStudent.getCurrent();
      if (response.success && response.student) {
        setUser(response.student);
      }
    } catch (error) {
      console.error('Error fetching current student:', error);
      if (error.status === 401) {
        localStorage.removeItem('open_student_token');
        localStorage.removeItem('open_student_data');
        navigate(ROUTES.STUDENT.OPEN.REGISTER, { replace: true });
      }
    }
  };

  // Periodic check for is_selected status changes (only for regular students)
  useEffect(() => {
    if (isOpenStudent || !authService.isAuthenticated() || !authService.isStudent()) {
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

            // Redirect based on new selection status
            if (currentUser.is_selected) {
              // Student just became selected, ensure they stay on dashboard
              navigate(ROUTES.STUDENT.DASHBOARD, { replace: true });
            } else {
              // Student was deselected while on portal – send them back to test instructions
              navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true });
            }
          }
        }
      } catch (error) {
        // Check if this is an authentication error (401) or network/server error
        const statusCode = error.status || (error.message && error.message.match(/\b(401|403|500|502|503|504)\b/)?.[1]);
        const isAuthError = statusCode === 401 || 
                           (error.message && (
                             error.message.includes('Unauthorized') ||
                             error.message.includes('Invalid token') ||
                             error.message.includes('Token expired')
                           ));
        
        // Check if it's a network error (server restart, network issue, etc.)
        const isNetworkError = error.isNetworkError || 
                               (!statusCode && (
                                 error.message && (
                                   error.message.includes('Failed to fetch') ||
                                   error.message.includes('NetworkError') ||
                                   error.message.includes('Network request failed')
                                 ) ||
                                 error.name === 'TypeError'
                               ));
        
        // Only logout if it's an actual authentication error (401)
        // For network/server errors, keep the session
        if (isAuthError) {
          // Token is invalid or expired, force logout
          console.error('Authentication error, logging out:', error);
          authService.logout();
          navigate(ROUTES.LOGIN, { replace: true });
        } else if (!isNetworkError && statusCode !== 500 && statusCode !== 502 && statusCode !== 503 && statusCode !== 504) {
          // Only log other errors (not network/server errors) in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error checking user status (non-critical):', error);
          }
        }
        // For network/server errors, silently fail and keep the session
      }
    };

    // Check immediately
    checkUserStatus();

    // Set up interval to check every 30 seconds (reduced frequency to avoid interference)
    const intervalId = setInterval(checkUserStatus, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set up once on mount

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
      
      if (isOpenStudent) {
        // Open student dashboard - simpler API
        const response = await api.openStudent.getDashboard();
        if (response.success) {
          const items = response.dashboard?.continueWatching || [];
          setContinueWatching(items);
          // Open students don't have recentActivity, recommendedPlaylists, or recommendedTests
          setRecentActivity([]);
          setRecommendedPlaylists([]);
          setRecommendedTests([]);
        }
      } else {
        // Regular student dashboard - full API
        const [videosRes, playlistsRes, testsRes] = await Promise.all([
          api.activity.getRecentVideos().catch(() => ({ success: false, videos: [] })),
          api.playlists.getRecommendedPlaylists().catch(() => ({ success: false, playlists: [] })),
          api.studentTests.getAvailable().catch(() => ({ success: false, data: [] })),
        ]);

        if (videosRes.success) {
          let videos = videosRes.videos || [];
          setContinueWatching(videos);
          setRecentActivity(videos.slice(0, 5) || []);
        }

        if (playlistsRes.success) {
          setRecommendedPlaylists(playlistsRes.playlists || []);
        }

        if (testsRes.success) {
          setRecommendedTests(testsRes.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleRemoveVideo = async (videoId, video) => {
    try {
      // console.log(`[Remove Video] Removing video ${videoId} from continue watching`);
      
      // Call API to delete video progress (manual removal)
      // This prevents the next video from being automatically added
      const response = await api.videoTracking.markAsCompleted(videoId, true);
      
      if (response.success) {
        // console.log(`[Remove Video] Successfully removed video ${videoId}`);
        
        // Remove video from local state immediately for better UX
        setContinueWatching(prev => prev.filter(v => (v.id || v.videoId) !== videoId));
        setRecentActivity(prev => prev.filter(v => (v.id || v.videoId) !== videoId));
        
        // Refresh dashboard after a delay to ensure backend has processed the deletion
        // Backend will handle not showing next videos for manually removed videos
        setTimeout(() => {
          fetchDashboardData();
        }, 500);
      } else {
        console.error('[Remove Video] Failed to remove video:', response.message);
        alert('Failed to remove video. Please try again.');
      }
    } catch (err) {
      console.error('[Remove Video] Error removing video:', err);
      alert('Error removing video. Please try again.');
    }
  };

  const fetchPlaylistsData = async () => {
    try {
      setLoadingPlaylists(true);
      
      if (isOpenStudent) {
        // Open student playlists
        const response = await api.openStudent.getPlaylists();
        if (response.success) {
          setAllPlaylists(response.playlists || []);
        }
        // Open students don't have recommended playlists
        setRecommendedPlaylists([]);
      } else {
        // Regular student playlists
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
    // Use i.ytimg.com (more reliable) and a higher quality default thumbnail
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
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
    // console.log('handleVideoClick called with video:', video);
    
    // Construct YouTube URL if not provided
    let youtubeUrl = video.youtubeUrl;
    if (!youtubeUrl && video.videoId) {
      // If we have videoId (YouTube ID), construct the URL
      youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    }
    
    // console.log('Constructed youtubeUrl:', youtubeUrl);
    
    if (!youtubeUrl) {
      console.error('Cannot open video: missing YouTube URL and videoId', video);
      return;
    }
    
    try {
      // Navigate to video page instead of opening YouTube in new tab
      const videoUrl = encodeURIComponent(youtubeUrl);
      const title = encodeURIComponent(video.videoTitle || video.title || 'Video');
      
      // Extract YouTube video ID from URL for the route parameter
      // The VideoPage will find the actual video by YouTube URL if videoId doesn't match
      const youtubeVideoId = extractVideoId(youtubeUrl);
      
      if (!youtubeVideoId) {
        console.error('Cannot extract YouTube video ID from URL:', youtubeUrl);
        return;
      }
      
      // Use YouTube video ID for the route (VideoPage will find the actual video by URL)
      const routeVideoId = youtubeVideoId;
      
      // Get lastPosition from video data (for continue watching)
      // CRITICAL: Extract lastPosition - check multiple possible field names
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
      
      // CRITICAL: Add dbVideoId parameter for proper tracking (especially for video_next videos)
      // Use video.id (database video ID) if available, otherwise use video.videoId
      const dbVideoId = video.id || video.videoId;
      const dbVideoIdParam = dbVideoId ? `&dbVideoId=${dbVideoId}` : '';
      
      let navigationPath = '';
      if (selectedPlaylist) {
        // Include playlist context from modal
        navigationPath = `/student/video/${routeVideoId}?url=${videoUrl}&playlistId=${selectedPlaylist.id}&title=${title}${startTimeParam}${dbVideoIdParam}`;
      } else if (video.playlistId) {
        // Video has playlist context from continue watching
        navigationPath = `/student/video/${routeVideoId}?url=${videoUrl}&playlistId=${video.playlistId}&title=${title}${startTimeParam}${dbVideoIdParam}`;
      } else {
        // Single video without playlist - try to find it in any playlist
        // Use YouTube ID as placeholder, VideoPage will handle finding the video
        navigationPath = `/student/video/${routeVideoId}?url=${videoUrl}&title=${title}${startTimeParam}${dbVideoIdParam}`;
      }
      
      // console.log('Navigating to:', navigationPath);
      navigate(navigationPath);
    } catch (error) {
      console.error('Error navigating to video:', error);
      // Fallback: open in new tab
      window.open(youtubeUrl, '_blank');
    }
  };

  const handleCloseModal = () => {
    setIsPlaylistModalOpen(false);
    setSelectedPlaylist(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex w-full lg:ml-64 bg-white items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-green-600 border-t-transparent mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (tab && !DASHBOARD_TAB_IDS.includes(tab)) {
    return <Navigate to={ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD} replace />;
  }

  return (
    <>
      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full lg:ml-64">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 lg:static">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen((prev) => !prev)}
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
                    Welcome back, {user?.full_name || user?.name || user?.email || 'Student'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isOpenStudent) {
                    localStorage.removeItem('open_student_token');
                    localStorage.removeItem('open_student_data');
                    api.openStudent.logout().catch(() => {});
                    navigate(ROUTES.LANDING, { replace: true });
                  } else {
                    authService.logout();
                    navigate(ROUTES.LOGIN);
                  }
                }}
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
              {/* Time Tracking Component - only for regular students */}
              {!isOpenStudent && <TimeTracking />}
              
              <DashboardTab
                loadingDashboard={loadingDashboard}
                continueWatching={continueWatching}
                recentActivity={isOpenStudent ? [] : recentActivity}
                recommendedPlaylists={isOpenStudent ? [] : recommendedPlaylists}
                recommendedTests={isOpenStudent ? [] : recommendedTests}
                getThumbnailUrl={getThumbnailUrl}
                handlePlaylistClick={handlePlaylistClick}
                handleVideoClick={handleVideoClick}
                onRemoveVideo={isOpenStudent ? undefined : handleRemoveVideo}
              />
            </div>
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

          {/* Activity Tab - only for regular students */}
          {!isOpenStudent && activeTab === 'activity' && (
            <ActivityTab
              loadingActivity={loadingActivity}
              activitySummary={activitySummary}
              formatTime={formatTime}
            />
          )}

          {/* NOC Tab - only for regular students */}
          {!isOpenStudent && activeTab === 'internship' && <InternshipTab />}
          {!isOpenStudent && activeTab === 'noc' && <NOCTab />}
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
    </>
  );
};

export default StudentDashboardPage;
