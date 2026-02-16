import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '../../config/paths'
import { X, ChevronDown, ChevronRight, LayoutDashboard, Users, FileText, Music, FolderKanban, ClipboardCheck, BarChart3, Settings, Shield, Lock, Clock, Building2 } from 'lucide-react'
import { useSidebar } from '../../contexts/SidebarContext'

// Navigation menu configuration
// Routes that ADMIN users can access (all others will be disabled). All analytics tabs: ADMIN + SUPER_ADMIN.
const ADMIN_ALLOWED_ROUTES = [
  ROUTES.PROJECT_MANAGEMENT,
  ROUTES.EVALUATION_MANAGEMENT,
  ROUTES.STUDENT_ANALYTICS,
  ROUTES.OPEN_STUDENT_ANALYTICS,
  ROUTES.FIREBASE_ANALYTICS,
  ROUTES.TIMER_LOGS,
  ROUTES.DOMAIN_MANAGEMENT,
  ROUTES.INSTITUTE_MANAGEMENT,
]

const NAVIGATION_MENU = {
  dashboard: {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  sections: [
    {
      id: 'studentManagement',
      label: 'Student Management',
      routes: [ROUTES.INTERNS.VIEW, ROUTES.NOC_MANAGEMENT, ROUTES.FEEDBACK_MANAGEMENT, ROUTES.INTERNSHIP_STATUS],
      items: [
        { label: 'Candidates', path: ROUTES.INTERNS.VIEW, icon: Users },
        { label: 'NOC Letters', path: ROUTES.NOC_MANAGEMENT, icon: FileText },
        { label: 'Feedback', path: ROUTES.FEEDBACK_MANAGEMENT, icon: FileText },
        { label: 'Internship Status', path: ROUTES.INTERNSHIP_STATUS, icon: ClipboardCheck },
      ],
    },
    {
      id: 'contentManagement',
      label: 'Content Management',
      routes: [ROUTES.QUESTION_PAPERS.BASE, ROUTES.PLAYLISTS.BASE, ROUTES.DOMAIN_MANAGEMENT, ROUTES.INSTITUTE_MANAGEMENT],
      items: [
        { label: 'Question Papers', path: ROUTES.QUESTION_PAPERS.LIST, icon: FileText, matchPattern: ROUTES.QUESTION_PAPERS.BASE },
        { label: 'Playlists', path: ROUTES.PLAYLISTS.MANAGEMENT, icon: Music, matchPattern: ROUTES.PLAYLISTS.BASE },
        { label: 'Domains', path: ROUTES.DOMAIN_MANAGEMENT, icon: FolderKanban },
        { label: 'Institutes', path: ROUTES.INSTITUTE_MANAGEMENT, icon: Building2 },
      ],
    },
    {
      id: 'projectEvaluation',
      label: 'Project & Evaluation',
      routes: [ROUTES.PROJECT_MANAGEMENT, ROUTES.EVALUATION_MANAGEMENT],
      items: [
        { label: 'Projects', path: ROUTES.PROJECT_MANAGEMENT, icon: FolderKanban },
        { label: 'Evaluations', path: ROUTES.EVALUATION_MANAGEMENT, icon: ClipboardCheck },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      routes: [ROUTES.STUDENT_ANALYTICS, ROUTES.OPEN_STUDENT_ANALYTICS, ROUTES.FIREBASE_ANALYTICS, ROUTES.TIMER_LOGS],
      items: [
        { label: 'User Analytics', path: ROUTES.FIREBASE_ANALYTICS, icon: BarChart3 },
        { label: 'Timer Logs', path: ROUTES.TIMER_LOGS, icon: Clock },
        { label: 'Student Analytics', path: ROUTES.STUDENT_ANALYTICS, icon: BarChart3 },
        { label: 'Open Student Analytics', path: ROUTES.OPEN_STUDENT_ANALYTICS, icon: BarChart3 },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      routes: [ROUTES.RETEST_MANAGEMENT, ROUTES.ADMIN_MANAGEMENT, ROUTES.SETTINGS],
      items: [
        { label: 'Retest Management', path: ROUTES.RETEST_MANAGEMENT, icon: Settings },
        { label: 'Admin Management', path: ROUTES.ADMIN_MANAGEMENT, icon: Shield, requiresRole: 'SUPER_ADMIN' },
        { label: 'Settings', path: ROUTES.SETTINGS, icon: Settings, requiresRole: 'SUPER_ADMIN' },
      ],
    },
  ],
}

// Helper function to determine which sections should be expanded
const getExpandedSectionsForPath = (pathname) => {
  const expanded = {}
  NAVIGATION_MENU.sections.forEach((section) => {
    expanded[section.id] = section.routes.some((route) => {
      // Handle base routes that should match any sub-route
      if (route === ROUTES.QUESTION_PAPERS.BASE || route === ROUTES.PLAYLISTS.BASE) {
        return pathname.startsWith(route)
      }
      // Handle exact route matches
      return pathname === route
    })
  })
  return expanded
}

// NavItem Component
const NavItem = React.memo(({ item, pathname, isActive, onNavigate, user }) => {
  const Icon = item.icon
  const isMatch = item.matchPattern
    ? pathname.startsWith(item.matchPattern)
    : pathname === item.path

  // Check if item is disabled for ADMIN users
  const isDisabled = user?.role === 'ADMIN' && !ADMIN_ALLOWED_ROUTES.includes(item.path)

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault()
      return
    }
    onNavigate()
  }

  return (
    <li>
      <Link
        to={item.path}
        onClick={handleClick}
        className={`
          flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
          transition-all duration-200 ease-in-out
          ${isDisabled
            ? 'text-gray-400 cursor-not-allowed opacity-60'
            : isMatch || isActive
            ? 'bg-[#4C763B]/10 text-[#4C763B] shadow-sm'
            : 'text-gray-700 hover:bg-gray-50 hover:text-[#4C763B]'
          }
        `}
        aria-current={isMatch || isActive ? 'page' : undefined}
        aria-disabled={isDisabled}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isMatch || isActive ? 'text-[#4C763B]' : isDisabled ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className="flex-1">{item.label}</span>
        {isDisabled && <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
      </Link>
    </li>
  )
})

NavItem.displayName = 'NavItem'

// CollapsibleSection Component
const CollapsibleSection = React.memo(({ section, isExpanded, pathname, onToggle, onNavigate, user }) => {
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50"
        aria-expanded={isExpanded}
      >
        <span>{section.label}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
        ) : (
          <ChevronRight className="h-4 w-4 transition-transform duration-200" />
        )}
      </button>
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <ul className="space-y-1 pl-1">
          {section.items.map((item) => {
            // Check if item requires specific role
            if (item.requiresRole && user?.role !== item.requiresRole) {
              return null
            }
            return (
              <NavItem
                key={item.path}
                item={item}
                pathname={pathname}
                isActive={false}
                onNavigate={onNavigate}
                user={user}
              />
            )
          })}
        </ul>
      </div>
    </div>
  )
})

CollapsibleSection.displayName = 'CollapsibleSection'

const Sidebar = React.memo(function Sidebar({ user }) {
  const location = useLocation()
  const { isOpen: sidebarOpen, setIsOpen: setSidebarOpen } = useSidebar()

  // Memoize pathname to prevent unnecessary re-renders
  const pathname = useMemo(() => location.pathname, [location.pathname])

  // Initialize expanded sections based on current route
  const [expandedSections, setExpandedSections] = useState(() => {
    return getExpandedSectionsForPath(pathname)
  })

  // Track previous pathname to prevent unnecessary updates
  const prevPathnameRef = useRef(pathname)
  const prevPathnameForSidebarRef = useRef(pathname)

  // Update expanded sections when route changes
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname
      const newExpanded = getExpandedSectionsForPath(pathname)
      setExpandedSections((prev) => {
        // Only update if something actually changed
        const hasChanged = Object.keys(newExpanded).some(
          (key) => newExpanded[key] !== prev[key]
        )
        return hasChanged ? newExpanded : prev
      })
    }
  }, [pathname])

  // Close sidebar on mobile when route changes (only trigger on pathname change, not sidebarOpen change)
  useEffect(() => {
    if (prevPathnameForSidebarRef.current !== pathname) {
      prevPathnameForSidebarRef.current = pathname
      // Close sidebar on mobile when navigating to a new route
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }, [])

  const handleNavClick = useCallback(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [setSidebarOpen])

  const isDashboardActive = pathname === ROUTES.DASHBOARD

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-[60] h-screen w-64
          bg-white border-r border-gray-200
          flex flex-col
          transition-transform duration-300 ease-in-out will-change-transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-lg lg:shadow-none
        `}
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            <span className="text-[#4C763B]">Scholar</span>Flex
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Dashboard Link */}
          <div>
            {user?.role === 'ADMIN' ? (
              <div
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-all duration-200 ease-in-out
                  text-gray-400 cursor-not-allowed opacity-60
                `}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="flex-1">Dashboard</span>
                <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </div>
            ) : (
              <Link
                to={ROUTES.DASHBOARD}
                onClick={handleNavClick}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-all duration-200 ease-in-out
                  ${isDashboardActive
                    ? 'bg-[#4C763B]/10 text-[#4C763B] shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#4C763B]'
                  }
                `}
                aria-current={isDashboardActive ? 'page' : undefined}
              >
                <LayoutDashboard className={`h-4 w-4 shrink-0 ${isDashboardActive ? 'text-[#4C763B]' : 'text-gray-500'}`} />
                <span>Dashboard</span>
              </Link>
            )}
          </div>

          {/* Collapsible Sections */}
          {NAVIGATION_MENU.sections.map((section) => (
            <CollapsibleSection
              key={section.id}
              section={section}
              isExpanded={expandedSections[section.id] || false}
              pathname={pathname}
              onToggle={() => toggleSection(section.id)}
              onNavigate={handleNavClick}
              user={user}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}, (prevProps, nextProps) => {
  // Only re-render if user role changes
  return prevProps.user?.role === nextProps.user?.role
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
