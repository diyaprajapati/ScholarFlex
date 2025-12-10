import React from 'react';
import { X, Play, Video } from 'lucide-react';

const PlaylistModal = ({
  isOpen,
  selectedPlaylist,
  onClose,
  getThumbnailUrl,
  handleVideoClick,
}) => {
  if (!isOpen || !selectedPlaylist) return null;

  return (
    <div 
      className="fixed inset-0 backdrop-blur-md bg-opacity-10 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              {selectedPlaylist.title}
            </h2>
            {selectedPlaylist.description && (
              <p className="text-sm text-gray-600">{selectedPlaylist.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {selectedPlaylist.domain?.name || 'No domain'} • {selectedPlaylist.videos?.length || 0} video{selectedPlaylist.videos?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content - Videos List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {selectedPlaylist.videos && selectedPlaylist.videos.length > 0 ? (
            <div className="space-y-4">
              {selectedPlaylist.videos.map((video, index) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all cursor-pointer"
                >
                  <div className="shrink-0">
                    {getThumbnailUrl(video.youtubeUrl) ? (
                      <img
                        src={getThumbnailUrl(video.youtubeUrl)}
                        alt={video.title}
                        className="w-32 h-20 sm:w-40 sm:h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-32 h-20 sm:w-40 sm:h-24 bg-gray-200 rounded flex items-center justify-center">
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2">
                            {video.title}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Click to watch
                        </p>
                      </div>
                      <div className="ml-4 shrink-0">
                        <Play className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No videos in this playlist yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistModal;

