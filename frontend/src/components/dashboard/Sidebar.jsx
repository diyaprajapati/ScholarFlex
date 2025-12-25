import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '../../config/paths'
import CandidatesTab from '../../pages/admin/CandidatesTab';
import { X } from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';

export default function Sidebar({ user }) {
  const location = useLocation()
  const { isOpen: sidebarOpen, setIsOpen: setSidebarOpen } = useSidebar()

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [location.pathname, setSidebarOpen])

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
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
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 h-screen bg-white flex flex-col border-r border-gray-200 
          fixed left-0 top-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                <span className="text-[#4C763B]">Scholar</span>Flex
              </h2>
              {/* Close button for mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
                  onClick={() => handleNavClick('candidates')}
                  className={navItemClasses(ROUTES.INTERNS.VIEW)}
                  style={navItemStyle(ROUTES.INTERNS.VIEW)}
                  {...navItemHoverStyle(ROUTES.INTERNS.VIEW)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V8H2v12h5m10 0v-6h-4v6m4 0H7" />
                  </svg>
                  Candidates
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.NOC_MANAGEMENT}
                  onClick={() => handleNavClick('noc-management')}
                  className={navItemClasses(ROUTES.NOC_MANAGEMENT)}
                  style={navItemStyle(ROUTES.NOC_MANAGEMENT)}
                  {...navItemHoverStyle(ROUTES.NOC_MANAGEMENT)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  NOC Letters
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.FEEDBACK_MANAGEMENT}
                  onClick={() => handleNavClick('feedback-management')}
                  className={navItemClasses(ROUTES.FEEDBACK_MANAGEMENT)}
                  style={navItemStyle(ROUTES.FEEDBACK_MANAGEMENT)}
                  {...navItemHoverStyle(ROUTES.FEEDBACK_MANAGEMENT)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Feedback
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.INTERNSHIP_STATUS}
                  onClick={() => handleNavClick('internship-status')}
                  className={navItemClasses(ROUTES.INTERNSHIP_STATUS)}
                  style={navItemStyle(ROUTES.INTERNSHIP_STATUS)}
                  {...navItemHoverStyle(ROUTES.INTERNSHIP_STATUS)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Internship Status
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.PROJECT_MANAGEMENT}
                  onClick={() => handleNavClick('project-management')}
                  className={navItemClasses(ROUTES.PROJECT_MANAGEMENT)}
                  style={navItemStyle(ROUTES.PROJECT_MANAGEMENT)}
                  {...navItemHoverStyle(ROUTES.PROJECT_MANAGEMENT)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Projects
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.EVALUATION_MANAGEMENT}
                  onClick={() => handleNavClick('evaluation-management')}
                  className={navItemClasses(ROUTES.EVALUATION_MANAGEMENT)}
                  style={navItemStyle(ROUTES.EVALUATION_MANAGEMENT)}
                  {...navItemHoverStyle(ROUTES.EVALUATION_MANAGEMENT)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Evaluations
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
              {/* <li>
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
              </li> */}
              <li>
                <Link
                  to={ROUTES.STUDENT_ANALYTICS}
                  onClick={() => handleNavClick('student-analytics')}
                  className={navItemClasses(ROUTES.STUDENT_ANALYTICS)}
                  style={navItemStyle(ROUTES.STUDENT_ANALYTICS)}
                  {...navItemHoverStyle(ROUTES.STUDENT_ANALYTICS)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Student Analytics
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.RETEST_MANAGEMENT}
                  onClick={() => handleNavClick('retest-management')}
                  className={navItemClasses(ROUTES.RETEST_MANAGEMENT)}
                  style={navItemStyle(ROUTES.RETEST_MANAGEMENT)}
                  {...navItemHoverStyle(ROUTES.RETEST_MANAGEMENT)}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9M4 20v-5h.582m0 0A8.003 8.003 0 0012 20a8.003 8.003 0 007.418-5"
                    />
                  </svg>
                  Retest Management
                </Link>
              </li>
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
    </>
  )
}


