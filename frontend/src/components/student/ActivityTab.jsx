import React from 'react';
import { Play, FileText, BookOpen, Clock } from 'lucide-react';

const ActivityTab = ({ loadingActivity, activitySummary, formatTime }) => {
  return (
    <div className="space-y-6 sm:space-y-8">
      {loadingActivity ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent"></div>
        </div>
      ) : !activitySummary ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No activity data available</p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Videos Watched</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{activitySummary.videosWatched.total}</p>
                  <p className="text-xs text-gray-500 mt-1">{activitySummary.videosWatched.unique} unique</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Tests Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{activitySummary.testsCompleted.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: {activitySummary.testsCompleted.averageScore}%
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Playlists Opened</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{activitySummary.playlistsOpened.total}</p>
                  <p className="text-xs text-gray-500 mt-1">{activitySummary.playlistsOpened.unique} unique</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Time Spent</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {formatTime(activitySummary.timeSpent.totalSeconds)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activitySummary.timeSpent.totalHours} hours
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Videos Watched Table */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Videos Watched</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Video
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Playlist
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activitySummary.videosWatched.list.slice(0, 20).map((video) => (
                      <tr key={video.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-xs">{video.videoTitle}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                          <div className="text-xs sm:text-sm text-gray-500 truncate max-w-xs">{video.playlistTitle || 'N/A'}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-xs sm:text-sm text-gray-500">
                            {new Date(video.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${video.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600">{video.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Tests Completed Table */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Tests Completed</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test Name
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activitySummary.testsCompleted.list.slice(0, 20).map((test) => (
                      <tr key={test.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-xs">{test.testName}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <span className={`text-xs sm:text-sm font-medium ${
                            test.percentage >= 70 ? 'text-green-600' : 
                            test.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {test.percentage || test.score || 'N/A'}%
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-xs sm:text-sm text-gray-500">
                            {new Date(test.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Playlists Opened Table */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Playlists Opened</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Playlist Name
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activitySummary.playlistsOpened.list.slice(0, 20).map((playlist) => (
                      <tr key={playlist.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-xs">{playlist.playlistTitle || 'Unknown'}</div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="text-xs sm:text-sm text-gray-500">
                            {new Date(playlist.timestamp).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ActivityTab;

