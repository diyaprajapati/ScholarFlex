import React from 'react';
import { Video } from 'lucide-react';

const PlaylistsTab = ({
  loadingPlaylists,
  recommendedPlaylists,
  allPlaylists,
  getThumbnailUrl,
  handlePlaylistClick,
}) => {
  // Ensure allPlaylists is always an array
  const safeAllPlaylists = Array.isArray(allPlaylists) ? allPlaylists : [];
  const safeRecommendedPlaylists = Array.isArray(recommendedPlaylists) ? recommendedPlaylists : [];
  
  // console.log('PlaylistsTab render:', { 
  //   loadingPlaylists, 
  //   allPlaylistsLength: safeAllPlaylists.length, 
  //   allPlaylists: safeAllPlaylists,
  //   recommendedPlaylistsLength: safeRecommendedPlaylists.length
  // });
  
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Recommended for Your Domain */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Recommended for Your Domain</h2>
        {loadingPlaylists ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          </div>
        ) : safeRecommendedPlaylists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No recommended playlists for your domain</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {safeRecommendedPlaylists.map((playlist) => {
              const firstVideo = playlist.videos && playlist.videos.length > 0 ? playlist.videos[0] : null;
              const thumbnailUrl = firstVideo?.youtubeUrl ? getThumbnailUrl(firstVideo.youtubeUrl) : null;
              
              return (
                <div
                  key={playlist.id}
                  onClick={() => handlePlaylistClick(playlist)}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="aspect-video bg-gray-200 flex items-center justify-center">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={playlist.title || 'Playlist'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Video className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
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
              );
            })}
          </div>
        )}
      </section>

      {/* All Playlists */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">All Playlists</h2>
        {loadingPlaylists ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
          </div>
        ) : safeAllPlaylists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No playlists available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {safeAllPlaylists.map((playlist) => {
              const firstVideo = playlist.videos && playlist.videos.length > 0 ? playlist.videos[0] : null;
              const thumbnailUrl = firstVideo?.youtubeUrl ? getThumbnailUrl(firstVideo.youtubeUrl) : null;
              
              return (
                <div
                  key={playlist.id}
                  onClick={() => handlePlaylistClick(playlist)}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="aspect-video bg-gray-200 flex items-center justify-center">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={playlist.title || 'Playlist'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Video className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default PlaylistsTab;

