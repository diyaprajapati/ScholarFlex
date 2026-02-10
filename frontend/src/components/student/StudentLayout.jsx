import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import { useStudentLayout } from '../../contexts/StudentLayoutContext';

/**
 * Layout that renders the student sidebar once and keeps it mounted
 * when switching between student routes (dashboard tabs, video, form, etc.).
 * Child routes render inside <Outlet /> so only the main content remounts.
 */
export default function StudentLayout() {
  const { sidebarOpen, setSidebarOpen, onLockedTabClick } = useStudentLayout();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <StudentSidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onLockedTabClick={onLockedTabClick}
      />
      <Outlet />
    </div>
  );
}
