import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import { api } from '../../services/api'
import { Menu } from 'lucide-react'
import { useSidebar } from '../../contexts/SidebarContext'

export default function TopNavbar({ user }) {
  const navigate = useNavigate()
  const { toggleSidebar } = useSidebar()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const notifications = [
    { id: 1, title: 'New intern registered', message: 'John Doe has registered for Web Development', time: '5 min ago', read: false },
    { id: 2, title: 'Aptitude test completed', message: 'Jane Smith completed the aptitude test', time: '1 hour ago', read: false },
    { id: 3, title: 'Student selected', message: 'Mike Johnson has been selected', time: '2 hours ago', read: true },
    { id: 4, title: 'New domain added', message: 'Cloud Computing domain has been added', time: '3 hours ago', read: true },
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      await api.auth.logout()
    } catch (error) {
      // Even if logout fails, clear local token
      console.error('Logout error:', error)
    } finally {
      // Clear token from localStorage
      authService.logout()
      navigate(ROUTES.LOGIN, { replace: true })
    }
  }

  return (
    <nav className="h-14 sm:h-16 bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 lg:ml-64">
      <div className="h-full px-4 sm:px-5 lg:px-6 flex items-center justify-between">
        {/* Left side - Hamburger menu for mobile */}
        <div className="flex items-center gap-3 lg:flex-1">
          {/* Hamburger menu button - visible on mobile */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          {/* Optional: Add breadcrumbs or page title here */}
        </div>

        {/* Right side - Notifications and Profile */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Notifications */}
          {/* <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowProfileMenu(false)
              }}
              className="relative p-1.5 sm:p-2 text-gray-600 hover:text-[#4C763B] hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-red-500 text-white text-[9px] sm:text-[10px] lg:text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button> */}

            {/* Notifications Dropdown */}
            {/* {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 lg:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-hidden">
                  <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] sm:text-xs text-[#4C763B] font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-80">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-[#4C763B]/5' : ''
                            }`}
                            onClick={() => setShowNotifications(false)}
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              <div className={`flex-shrink-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-1.5 sm:mt-2 ${
                                !notification.read ? 'bg-[#4C763B]' : 'bg-gray-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 sm:p-8 text-center">
                        <p className="text-xs sm:text-sm text-gray-500">No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div> */}

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#4C763B] flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-900">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 sm:w-56 lg:w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-3 sm:p-4 border-b border-gray-200">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                  <div className="py-1 sm:py-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        // Navigate to profile page if exists
                      }}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false)
                        handleLogout()
                      }}
                      className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

