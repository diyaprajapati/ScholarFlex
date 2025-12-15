import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from '../components'
import { LoginPage, DashboardPage, QuestionPapersListPage, AddQuestionPaperFormPage, ViewQuestionPaperPage, AllInternsPage, AddInternPage, StudentDashboardPage, StudentTestInstructionsPage, StudentTestPage, TestSubmissionPage, VideoPage, NotFoundPage, TestAttemptsPage, AdminManagementPage, PlaylistManagementPage, AddVideosToPlaylistPage, NOCManagementPage, StudentAnalyticsPage, RetestManagementPage } from '../pages'
import { ROUTES } from './paths'

/**
 * Application Routes Configuration
 * Centralized route definitions using React Router
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path={ROUTES.LOGIN}
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes - Admin and Super Admin only */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.TEST_ATTEMPTS}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <TestAttemptsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Management Route - Super Admin only */}
      <Route
        path={ROUTES.ADMIN_MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AdminManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Question Papers Routes - Admin and Super Admin only */}
      <Route
        path={ROUTES.QUESTION_PAPERS.LIST}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <QuestionPapersListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.QUESTION_PAPERS.ADD}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AddQuestionPaperFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/question-papers/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AddQuestionPaperFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/question-papers/view/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <ViewQuestionPaperPage />
          </ProtectedRoute>
        }
      />

      {/* Interns Routes - Admin and Super Admin only */}
      <Route
        path={ROUTES.INTERNS.VIEW}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AllInternsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.INTERNS.ADD}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AddInternPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interns/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AddInternPage />
          </ProtectedRoute>
        }
      />

      {/* Playlist Routes - Admin and Super Admin only */}
      <Route
        path={ROUTES.PLAYLISTS.MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <PlaylistManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.PLAYLISTS.ADD_VIDEOS}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AddVideosToPlaylistPage />
          </ProtectedRoute>
        }
      />

      {/* NOC Management Route - Admin and Super Admin */}
      <Route
        path={ROUTES.NOC_MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <NOCManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Student Analytics Route - Admin and Super Admin */}
      <Route
        path={ROUTES.STUDENT_ANALYTICS}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <StudentAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RETEST_MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <RetestManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path={ROUTES.STUDENT.DASHBOARD_TABS.DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']} requireSelected={true}>
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.DASHBOARD_TABS.PLAYLISTS}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']} requireSelected={true}>
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.DASHBOARD_TABS.ACTIVITY}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']} requireSelected={true}>
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.DASHBOARD_TABS.NOC}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']} requireSelected={true}>
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.INSTRUCTIONS}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentTestInstructionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.TEST}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentTestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.SUBMISSION}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <TestSubmissionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/video/:videoId"
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <VideoPage />
          </ProtectedRoute>
        }
      />

      {/* 404 - Catch all route */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  )
}

