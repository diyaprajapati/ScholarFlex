import React from 'react';
import { LayoutDashboard, BookOpen, BarChart3, FileText, X } from 'lucide-react';

export default function StudentSidebar({ activeTab, setActiveTab, isOpen, setIsOpen }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'playlists', label: 'Playlists', icon: BookOpen },
    { id: 'activity', label: 'Activity', icon: BarChart3 },
    { id: 'noc', label: 'NOC Letter', icon: FileText },
  ];

  const handleItemClick = (itemId) => {
    setActiveTab(itemId);
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
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
          <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                <span className="text-green-600">Scholar</span>Flex
              </h2>
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Student Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    activeTab === item.id
                      ? 'bg-green-50 text-green-700 border-l-4 border-green-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-green-600' : 'text-gray-600'}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>© 2024 ScholarFlex</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

