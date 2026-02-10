import React, { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../utils/auth';
import LockedFeatureModal from '../components/student/LockedFeatureModal';

const StudentLayoutContext = createContext(null);

export function StudentLayoutProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const isOpenStudent = authService.getUserRole() === 'OPEN_STUDENT';

  const handleLockedTabClick = useCallback(() => {
    if (isOpenStudent) setShowLockedModal(true);
  }, [isOpenStudent]);

  const value = {
    sidebarOpen,
    setSidebarOpen,
    onLockedTabClick: isOpenStudent ? handleLockedTabClick : undefined,
    showLockedModal,
    setShowLockedModal,
  };

  return (
    <StudentLayoutContext.Provider value={value}>
      {children}
      {isOpenStudent && (
        <LockedFeatureModal
          isOpen={showLockedModal}
          onClose={() => setShowLockedModal(false)}
        />
      )}
    </StudentLayoutContext.Provider>
  );
}

export function useStudentLayout() {
  const ctx = useContext(StudentLayoutContext);
  if (!ctx) {
    return {
      sidebarOpen: false,
      setSidebarOpen: () => {},
      onLockedTabClick: undefined,
    };
  }
  return ctx;
}
