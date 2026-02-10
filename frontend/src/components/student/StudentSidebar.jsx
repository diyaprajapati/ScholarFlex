import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, BarChart3, FileText, X, Video, Briefcase, User, Lock } from 'lucide-react';
import { ROUTES } from '../../config/paths';
import { authService } from '../../utils/auth';

// Routes that OPEN_STUDENT users can access (all others will be disabled)
const OPEN_STUDENT_ALLOWED_ROUTES = [
  ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD,
  ROUTES.STUDENT.DASHBOARD_TABS.PLAYLISTS,
];

// Derive active tab id from pathname so parent re-renders don't change this prop
function getActiveTabFromPathname(pathname) {
  if (pathname === ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD) return 'dashboard';
  if (pathname === ROUTES.STUDENT.DASHBOARD_TABS.PLAYLISTS) return 'playlists';
  if (pathname === ROUTES.STUDENT.DASHBOARD_TABS.ACTIVITY) return 'activity';
  if (pathname === ROUTES.STUDENT.DASHBOARD_TABS.INTERNSHIP) return 'internship';
  if (pathname === ROUTES.STUDENT.DASHBOARD_TABS.NOC) return 'noc';
  if (pathname === ROUTES.STUDENT.VIDEO_ANALYTICS) return 'video-analytics';
  if (pathname === ROUTES.STUDENT.FORM) return 'profile';
  if (pathname.startsWith('/student/video/')) return null; // video player page
  return 'dashboard';
}

const StudentSidebar = React.memo(function StudentSidebar({ isOpen, setIsOpen, onLockedTabClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userRole = authService.getUserRole();
  const isOpenStudent = userRole === 'OPEN_STUDENT';

  const activeTab = useMemo(() => getActiveTabFromPathname(pathname), [pathname]);

  const menuItems = useMemo(() => [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD, 
      accessible: true 
    },
    { 
      id: 'playlists', 
      label: 'Playlists', 
      icon: BookOpen, 
      path: ROUTES.STUDENT.DASHBOARD_TABS.PLAYLISTS, 
      accessible: true 
    },
    { 
      id: 'activity', 
      label: 'Activity', 
      icon: BarChart3, 
      path: ROUTES.STUDENT.DASHBOARD_TABS.ACTIVITY, 
      accessible: !isOpenStudent 
    },
    { 
      id: 'internship', 
      label: 'Internship', 
      icon: Briefcase, 
      path: ROUTES.STUDENT.DASHBOARD_TABS.INTERNSHIP, 
      accessible: !isOpenStudent 
    },
    { 
      id: 'video-analytics', 
      label: 'Video Analytics', 
      icon: Video, 
      path: ROUTES.STUDENT.VIDEO_ANALYTICS, 
      accessible: !isOpenStudent 
    },
    { 
      id: 'profile', 
      label: 'My Profile', 
      icon: User, 
      path: ROUTES.STUDENT.FORM, 
      accessible: !isOpenStudent 
    },
    { 
      id: 'noc', 
      label: 'NOC Letter', 
      icon: FileText, 
      path: ROUTES.STUDENT.DASHBOARD_TABS.NOC, 
      accessible: !isOpenStudent 
    },
  ], [isOpenStudent]);

  const handleItemClick = (item) => {
    // Check if item is disabled for open students
    const isDisabled = isOpenStudent && !OPEN_STUDENT_ALLOWED_ROUTES.includes(item.path);
    
    if (!item.accessible || isDisabled) {
      // Show locked modal for open students
      if (onLockedTabClick) {
        onLockedTabClick();
      }
      return;
    }

    navigate(item.path);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-64
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-3 sm:p-4 lg:p-5 xl:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                <span className="text-green-600">Scholar</span>Flex
              </h2>
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">Student Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 sm:space-y-2">
            {menuItems.map((item) => {
              const isDisabled = isOpenStudent && !OPEN_STUDENT_ALLOWED_ROUTES.includes(item.path);
              const isLocked = !item.accessible || isDisabled;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  disabled={isLocked}
                  className={`
                    w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium
                    transition-all duration-200
                    ${
                      isLocked
                        ? 'opacity-60 cursor-not-allowed text-gray-400'
                        : isActive
                        ? 'bg-green-50 text-green-700 border-l-4 border-green-600 cursor-pointer'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-green-600 cursor-pointer'
                    }
                  `}
                  title={isLocked ? 'This feature is available only for students whose internship has started.' : ''}
                >
                  <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${
                    isLocked 
                      ? 'text-gray-400' 
                      : isActive 
                      ? 'text-green-600' 
                      : 'text-gray-600'
                  }`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isLocked && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>© 2025 ScholarFlex</p>
            </div>
          </div>
    </div>
  </aside>
    </>
  );
});

StudentSidebar.displayName = 'StudentSidebar';

export default StudentSidebar;

