import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicRoute, LandingPageGuard } from '../components'
import { LandingPage, LoginPage, DashboardPage, QuestionPapersListPage, AddQuestionPaperFormPage, ViewQuestionPaperPage, AllInternsPage, AddInternPage, StudentDashboardPage, OpenStudentDashboardPage, OpenVideoPage, StudentTestInstructionsPage, StudentTestPage, TestSubmissionPage, VideoPage, StudentVideoAnalyticsPage, FeedbackPage, StudentFormPage, NotFoundPage, TestAttemptsPage, AdminManagementPage, PlaylistManagementPage, AddVideosToPlaylistPage, NOCManagementPage, FeedbackManagementPage, StudentAnalyticsPage, OpenStudentAnalyticsPage, RetestManagementPage, CandidatesPage, InternshipStatusPage, ProjectManagementPage, EvaluationManagementPage } from '../pages'
import OpenStudentRegistration from '../components/student/OpenStudentRegistration'
import { ROUTES } from './paths'

/**
 * Application Routes Configuration
 * Centralized route definitions using React Router
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Landing Page - Public, but redirects authenticated users */}
      <Route
        path={ROUTES.LANDING}
        element={
          <LandingPageGuard>
            <LandingPage />
          </LandingPageGuard>
        }
      />

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
            <CandidatesPage />
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

      {/* Feedback Management Route - Admin and Super Admin */}
      <Route
        path={ROUTES.FEEDBACK_MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <FeedbackManagementPage />
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

      {/* Open Student Analytics Route - Admin and Super Admin */}
      <Route
        path={ROUTES.OPEN_STUDENT_ANALYTICS}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <OpenStudentAnalyticsPage />
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

      {/* Internship Status Route - Admin and Super Admin */}
      <Route
        path={ROUTES.INTERNSHIP_STATUS}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <InternshipStatusPage />
          </ProtectedRoute>
        }
      />

      {/* Project Management Route - Admin and Super Admin */}
      <Route
        path={ROUTES.PROJECT_MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <ProjectManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Evaluation Management Route - Admin and Super Admin */}
      <Route
        path={ROUTES.EVALUATION_MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <EvaluationManagementPage />
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
        path={ROUTES.STUDENT.DASHBOARD_TABS.INTERNSHIP}
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

      {/* Student Video Analytics Route */}
      <Route
        path={ROUTES.STUDENT.VIDEO_ANALYTICS}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']} requireSelected={true}>
            <StudentVideoAnalyticsPage />
          </ProtectedRoute>
        }
      />

      {/* Student Feedback Route */}
      <Route
        path={ROUTES.STUDENT.FEEDBACK}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <FeedbackPage />
          </ProtectedRoute>
        }
      />

      {/* Student Form Route */}
      <Route
        path={ROUTES.STUDENT.FORM}
        element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentFormPage />
          </ProtectedRoute>
        }
      />

      {/* Open Student Routes (Public - no auth required) */}
      <Route
        path={ROUTES.STUDENT.OPEN.REGISTER}
        element={<OpenStudentRegistration />}
      />
      <Route
        path={ROUTES.STUDENT.OPEN.DASHBOARD}
        element={<OpenStudentDashboardPage />}
      />
      <Route
        path={ROUTES.STUDENT.OPEN.PLAYLISTS}
        element={<OpenStudentDashboardPage />}
      />
      <Route
        path={ROUTES.STUDENT.OPEN.DEMO}
        element={<OpenStudentDashboardPage />}
      />

      <Route
        path="/student/open/video/:videoId"
        element={<OpenVideoPage />}
      />

      {/* 404 - Catch all route */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  )
}

