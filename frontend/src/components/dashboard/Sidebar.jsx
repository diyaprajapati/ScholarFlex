import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '../../config/paths'

export default function Sidebar({ user }) {
  const location = useLocation()

  const handleNavClick = () => {
    // Navigation click handler
  }

  const navItemClasses = (path) => {
    const isActive = location.pathname === path
    const baseClasses = 'flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors duration-150'
    if (isActive) {
      return `${baseClasses} text-[#4C763B]`
    }
    return `${baseClasses} text-gray-700 hover:text-[#4C763B]`
  }

  const navItemStyle = (path) => {
    const isActive = location.pathname === path
    if (isActive) {
      return { backgroundColor: 'rgba(76, 118, 59, 0.2)' }
    }
    return {}
  }

  const navItemHoverStyle = (path) => {
    const isActive = location.pathname === path
    return {
      onMouseEnter: (e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(76, 118, 59, 0.1)'
        }
      },
      onMouseLeave: (e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = ''
        }
      }
    }
  }

  return (
    <aside className="w-64 h-screen bg-white flex flex-col border-r border-gray-200 fixed left-0 top-0">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            <span className="text-[#4C763B]">Scholar</span>Flex
          </h2>
          <nav className="space-y-4 sm:space-y-5 lg:space-y-6 text-xs sm:text-sm">
            <ul className="space-y-2">
              <li>
                <Link
                  to={ROUTES.DASHBOARD}
                  onClick={() => handleNavClick('dashboard')}
                  className={navItemClasses(ROUTES.DASHBOARD)}
                  style={navItemStyle(ROUTES.DASHBOARD)}
                  {...navItemHoverStyle(ROUTES.DASHBOARD)}
                  aria-current={location.pathname === ROUTES.DASHBOARD ? 'page' : undefined}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.QUESTION_PAPERS.LIST}
                  onClick={() => handleNavClick('question-papers')}
                  className={navItemClasses(ROUTES.QUESTION_PAPERS.LIST)}
                  style={navItemStyle(ROUTES.QUESTION_PAPERS.LIST)}
                  {...navItemHoverStyle(ROUTES.QUESTION_PAPERS.LIST)}
                  aria-current={location.pathname.startsWith(ROUTES.QUESTION_PAPERS.BASE) ? 'page' : undefined}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h6v6m2 4H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z" />
                  </svg>
                  Question Papers
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.INTERNS.VIEW}
                  onClick={() => handleNavClick('all-interns')}
                  className={navItemClasses(ROUTES.INTERNS.VIEW)}
                  style={navItemStyle(ROUTES.INTERNS.VIEW)}
                  {...navItemHoverStyle(ROUTES.INTERNS.VIEW)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V8H2v12h5m10 0v-6h-4v6m4 0H7" />
                  </svg>
                  All Interns
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.PLAYLISTS.MANAGEMENT}
                  onClick={() => handleNavClick('playlists')}
                  className={navItemClasses(ROUTES.PLAYLISTS.MANAGEMENT)}
                  style={navItemStyle(ROUTES.PLAYLISTS.MANAGEMENT)}
                  {...navItemHoverStyle(ROUTES.PLAYLISTS.MANAGEMENT)}
                  aria-current={location.pathname.startsWith(ROUTES.PLAYLISTS.BASE) ? 'page' : undefined}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Playlists
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.TEST_ATTEMPTS}
                  onClick={() => handleNavClick('test-attempts')}
                  className={navItemClasses(ROUTES.TEST_ATTEMPTS)}
                  style={navItemStyle(ROUTES.TEST_ATTEMPTS)}
                  {...navItemHoverStyle(ROUTES.TEST_ATTEMPTS)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 11h18M5 7h14M7 15h10m-6 4h2" />
                  </svg>
                  Test Results
                </Link>
              </li>
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <li>
                  <Link
                    to={ROUTES.RETAKE_PERMISSIONS}
                    onClick={() => handleNavClick('retake-permissions')}
                    className={navItemClasses(ROUTES.RETAKE_PERMISSIONS)}
                    style={navItemStyle(ROUTES.RETAKE_PERMISSIONS)}
                    {...navItemHoverStyle(ROUTES.RETAKE_PERMISSIONS)}
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Retake Permissions
                  </Link>
                </li>
              )}
              {user?.role === 'SUPER_ADMIN' && (
                <li>
                  <Link
                    to={ROUTES.ADMIN_MANAGEMENT}
                    onClick={() => handleNavClick('admin-management')}
                    className={navItemClasses(ROUTES.ADMIN_MANAGEMENT)}
                    style={navItemStyle(ROUTES.ADMIN_MANAGEMENT)}
                    {...navItemHoverStyle(ROUTES.ADMIN_MANAGEMENT)}
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Admin Management
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  )
}


