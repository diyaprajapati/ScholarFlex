import React, { useState, useEffect } from 'react';
import { Play, Clock, Star, FileText, Video, ChevronLeft, ChevronRight, X } from 'lucide-react';

const DashboardTab = ({
  loadingDashboard,
  continueWatching,
  recentActivity,
  recommendedPlaylists,
  recommendedTests,
  getThumbnailUrl,
  handlePlaylistClick,
  handleVideoClick,
  onRemoveVideo,
}) => {
  const CONTINUE_PAGE_SIZE = 5;
  const [continueOffset, setContinueOffset] = useState(0);
  const totalContinueItems = continueWatching?.length || 0;
  const maxContinueOffset =
    totalContinueItems > CONTINUE_PAGE_SIZE
      ? totalContinueItems - CONTINUE_PAGE_SIZE
      : 0;

  useEffect(() => {
    // Reset to start whenever the list size changes
    setContinueOffset(0);
  }, [continueWatching?.length]);

  const handleContinuePrev = () => {
    setContinueOffset((prev) => Math.max(0, prev - 1));
  };

  const handleContinueNext = () => {
    setContinueOffset((prev) => Math.min(maxContinueOffset, prev + 1));
  };

  const continueStartIndex = continueOffset;
  const visibleContinueItems = (continueWatching || []).slice(
    continueStartIndex,
    continueStartIndex + CONTINUE_PAGE_SIZE
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="bg-linear-to-r from-green-50 to-green-100 rounded-lg p-4 sm:p-6 border border-green-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Welcome to Your Learning Dashboard
        </h2>
        <p className="text-sm sm:text-base text-gray-700">
          Continue your learning journey with personalized recommendations and track your progress.
        </p>
      </div>

      {/* Continue Watching */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Play className="w-5 h-5 mr-2 text-green-600" />
          Continue Watching
        </h2>
        {loadingDashboard ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          </div>
        ) : continueWatching.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No recent videos to continue watching</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-gray-500">
                Pick up exactly where you left off across all your playlists.
              </p>
              {totalContinueItems > CONTINUE_PAGE_SIZE && (
                <span className="text-[11px] sm:text-xs text-gray-400">
                  Showing {continueStartIndex + 1}–
                  {Math.min(totalContinueItems, continueStartIndex + CONTINUE_PAGE_SIZE)} of{' '}
                  {totalContinueItems} videos
                </span>
              )}
            </div>
            <div className="relative">
              {totalContinueItems > CONTINUE_PAGE_SIZE && (
                <>
                  <button
                    type="button"
                    onClick={handleContinuePrev}
                    disabled={continueOffset === 0}
                    className="hidden sm:flex items-center justify-center absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
                    aria-label="Previous videos"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueNext}
                    disabled={continueOffset === maxContinueOffset}
                    className="hidden sm:flex items-center justify-center absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-default"
                    aria-label="Next videos"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                </>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {visibleContinueItems.map((video) => {
                  // Support both intern and open-student shapes
                  const progressValue =
                    typeof video.progress === 'number'
                      ? video.progress
                      : typeof video.progressPercent === 'number'
                        ? video.progressPercent
                        : 0;

                  // console.log(`Video ${video.id} progress:`, {
                  //   title: video.title || video.videoTitle,
                  //   progress: video.progress,
                  //   progressPercent: video.progressPercent,
                  //   resolved: progressValue
                  // });

                  return (
                    <div
                      key={video.id || video.videoId}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative group"
                    >
                      {/* Close button - positioned on top right */}
                      {onRemoveVideo && (video.id || video.videoId) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const videoId = video.id || video.videoId;
                            // console.log('Removing video from continue watching:', videoId);
                            onRemoveVideo(videoId, video);
                          }}
                          className="absolute top-2 right-2 z-20 p-1.5 bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove from continue watching"
                          title="Remove from continue watching"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          // console.log('Continue watching video clicked:', video);

                          const youtubeUrl = video.youtubeUrl || (video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : null);

                          if (!youtubeUrl) {
                            console.error('Video missing YouTube URL and videoId:', video);
                            return;
                          }

                          if (handleVideoClick) {
                            handleVideoClick({ ...video, youtubeUrl });
                          } else {
                            console.warn('handleVideoClick not provided, opening in new tab');
                            window.open(youtubeUrl, '_blank');
                          }
                        }}
                        className="cursor-pointer"
                      >
                      <div className="aspect-video bg-gray-200 relative overflow-hidden">
                        {(() => {
                          const youtubeUrl =
                            video.youtubeUrl ||
                            (video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : null);
                          const thumbnailUrl = youtubeUrl ? getThumbnailUrl(youtubeUrl) : null;
                          return thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={video.videoTitle || 'Video'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // If thumbnail fails, hide image and show fallback icon
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                            </div>
                          );
                        })()}
                        {/* Progress bar - YouTube style */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-30">
                          {progressValue > 0 ? (
                            <div
                              className="h-full bg-red-600 transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                            ></div>
                          ) : null}
                        </div>
                      </div>
                      <div className="p-2 sm:p-3">
                        {/* Playlist Banner - YouTube style - ALWAYS SHOW IF AVAILABLE */}
                        {video.playlistTitle ? (
                          <div className="mb-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {video.playlistTitle}
                            </span>
                          </div>
                        ) : null}
                        <h3 className="font-medium text-xs sm:text-sm text-gray-900 line-clamp-2">
                          {video.videoTitle || 'Untitled Video'}
                        </h3>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      {/* <section>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-green-600" />
          Recent Activity
        </h2>
        {loadingDashboard ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{activity.videoTitle}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded shrink-0 ml-2">
                    {activity.activityType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section> */}

      {/* Recommended Playlists */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-green-600" />
          Recommended Playlists
        </h2>
        {loadingDashboard ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          </div>
        ) : recommendedPlaylists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No recommended playlists available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {recommendedPlaylists.slice(0, 4).map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => handlePlaylistClick(playlist)}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  {playlist.videos && playlist.videos.length > 0 ? (
                    <img
                      src={getThumbnailUrl(playlist.videos[0].youtubeUrl)}
                      alt={playlist.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {(!playlist.videos || playlist.videos.length === 0) && (
                    <Play className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="font-medium text-sm sm:text-base text-gray-900 line-clamp-2 mb-1">{playlist.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">{playlist.domain?.name || 'No domain'}</p>
                  <p className="text-xs text-gray-400">
                    {playlist.videos?.length || 0} video{playlist.videos?.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Tests */}
      {/* <section>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-green-600" />
          Recommended Tests
        </h2>
        {loadingDashboard ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          </div>
        ) : recommendedTests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No recommended tests available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedTests.slice(0, 3).map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm sm:text-base text-gray-900 flex-1">{test.paper_name}</h3>
                  {test.is_attempted && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded ml-2">
                      Attempted
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-3">{test.subject || 'General'}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Duration: {test.duration_minutes || 60} mins</span>
                  <span>{test.total_questions || 50} questions</span>
                </div>
                {test.attempt_score && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-green-600">
                      Score: {test.attempt_score}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section> */}
    </div>
  );
};

export default DashboardTab;

