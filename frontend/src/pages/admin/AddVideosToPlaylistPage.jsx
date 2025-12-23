import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';

const AddVideosToPlaylistPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    playlist_id: '',
    video_title: '',
    youtube_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [inputMode, setInputMode] = useState('single'); // 'single' or 'playlist'

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    const userData = authService.getUser();
    setUser(userData);
    
    // Check if user is ADMIN or SUPER_ADMIN
    if (userData?.role !== 'ADMIN' && userData?.role !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
    
    fetchPlaylists();
  }, [navigate]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await api.playlists.getAll();
      if (response.success) {
        setPlaylists(response.playlists || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch playlists');
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistVideos = async (playlistId) => {
    try {
      const response = await api.playlists.getAll();
      if (response.success) {
        const playlist = response.playlists.find(p => p.id === parseInt(playlistId));
        if (playlist) {
          setSelectedPlaylist(playlist);
          setVideos(playlist.videos || []);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch videos');
      console.error('Error fetching videos:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If playlist is selected, fetch its videos
    if (name === 'playlist_id' && value) {
      fetchPlaylistVideos(value);
    } else if (name === 'playlist_id' && !value) {
      setSelectedPlaylist(null);
      setVideos([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.playlist_id) {
      setError('Please select a playlist');
      return;
    }

    // Check if it's a playlist URL
    const isPlaylistUrl = formData.youtube_url.includes('playlist?list=');
    
    if (inputMode === 'playlist' || isPlaylistUrl) {
      // Handle bulk import from YouTube playlist
      try {
        setIsSubmitting(true);
        const response = await api.playlists.addVideosFromPlaylist(
          parseInt(formData.playlist_id),
          formData.youtube_url
        );

        if (response.success) {
          const { added, skipped, errors, total } = response.data;
          let message = `Successfully imported ${added} video(s)!`;
          
          if (skipped > 0) {
            message += ` ${skipped} video(s) were skipped (already exist).`;
          }
          if (errors > 0) {
            message += ` ${errors} video(s) had errors.`;
          }
          
          setSuccess(message);
          setFormData({
            playlist_id: formData.playlist_id,
            video_title: '',
            youtube_url: '',
          });
          // Refresh videos list
          fetchPlaylistVideos(formData.playlist_id);
          setTimeout(() => setSuccess(''), 5000);
        }
      } catch (err) {
        setError(err.message || 'Failed to import playlist');
        console.error('Error importing playlist:', err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle single video addition
    try {
      setIsSubmitting(true);
      const response = await api.playlists.addVideo(parseInt(formData.playlist_id), {
        video_title: formData.video_title,
        youtube_url: formData.youtube_url,
      });

      if (response.success) {
        setSuccess('Video added successfully!');
        setFormData({
          playlist_id: formData.playlist_id,
          video_title: '',
          youtube_url: '',
        });
        // Refresh videos list
        fetchPlaylistVideos(formData.playlist_id);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to add video');
      console.error('Error adding video:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!selectedPlaylist) return;
    
    if (!window.confirm('Are you sure you want to delete this video from the playlist?')) {
      return;
    }

    try {
      setIsDeleting({ ...isDeleting, [videoId]: true });
      const response = await api.playlists.deleteVideo(selectedPlaylist.id, videoId);

      if (response.success) {
        setSuccess('Video deleted successfully!');
        // Refresh videos list
        fetchPlaylistVideos(selectedPlaylist.id);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete video');
      console.error('Error deleting video:', err);
    } finally {
      setIsDeleting({ ...isDeleting, [videoId]: false });
    }
  };

  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getThumbnailUrl = (youtubeUrl) => {
    const videoId = extractVideoId(youtubeUrl);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => navigate(ROUTES.PLAYLISTS.MANAGEMENT)}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-3xl font-semibold text-gray-900">Add Videos to Playlist</h1>
            </div>
            <p className="text-gray-600 ml-10">Select a playlist and add YouTube videos to it</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Video</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="playlist_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Playlist *
                  </label>
                  {loading ? (
                    <div className="text-sm text-gray-500">Loading playlists...</div>
                  ) : (
                    <select
                      id="playlist_id"
                      name="playlist_id"
                      required
                      value={formData.playlist_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a playlist</option>
                      {playlists.map((playlist) => (
                        <option key={playlist.id} value={playlist.id}>
                          {playlist.title} ({playlist.domain?.name || 'N/A'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {inputMode === 'single' && (
                  <div>
                    <label htmlFor="video_title" className="block text-sm font-medium text-gray-700 mb-1">
                      Video Title *
                    </label>
                    <input
                      type="text"
                      id="video_title"
                      name="video_title"
                      required={inputMode === 'single'}
                      value={formData.video_title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter video title"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <label htmlFor="youtube_url" className="block text-sm font-medium text-gray-700">
                      YouTube URL *
                    </label>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setInputMode('single')}
                        className={`px-2 py-1 rounded ${
                          inputMode === 'single'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Single Video
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('playlist')}
                        className={`px-2 py-1 rounded ${
                          inputMode === 'playlist'
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Playlist URL
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    id="youtube_url"
                    name="youtube_url"
                    required
                    value={formData.youtube_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={
                      inputMode === 'playlist'
                        ? 'https://www.youtube.com/playlist?list=PLxxx...'
                        : 'https://www.youtube.com/watch?v=...'
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {inputMode === 'playlist' ? (
                      <span className="text-green-600">
                        ✓ Enter a YouTube playlist URL to import all videos automatically
                      </span>
                    ) : (
                      'Enter the full YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)'
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !formData.playlist_id}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting 
                    ? (inputMode === 'playlist' ? 'Importing Playlist...' : 'Adding...')
                    : (inputMode === 'playlist' ? 'Import Playlist' : 'Add Video')
                  }
                </button>
              </form>
            </div>

            {/* Right Column - Videos List */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedPlaylist ? `${selectedPlaylist.title} - Videos` : 'Videos'}
              </h2>
              
              {!selectedPlaylist ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>Select a playlist to view its videos</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>No videos in this playlist yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {videos.map((video, index) => (
                    <div key={video.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="shrink-0">
                        {getThumbnailUrl(video.youtubeUrl) ? (
                          <img
                            src={getThumbnailUrl(video.youtubeUrl)}
                            alt={video.title}
                            className="w-32 h-20 object-cover rounded"
                          />
                        ) : (
                          <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                              {index + 1}. {video.title}
                            </p>
                            <a
                              href={video.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 inline-block"
                            >
                              View on YouTube →
                            </a>
                          </div>
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
                            disabled={isDeleting[video.id]}
                            className="ml-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete video"
                          >
                            {isDeleting[video.id] ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddVideosToPlaylistPage;

