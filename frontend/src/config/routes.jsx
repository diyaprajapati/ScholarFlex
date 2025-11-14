import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from '../components'
import { LoginPage, DashboardPage, QuestionPapersListPage, AddQuestionPaperFormPage, ViewQuestionPaperPage, AllInternsPage, AddInternPage, StudentTestInstructionsPage, StudentTestPage, TestSubmissionPage, NotFoundPage } from '../pages'
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

      {/* Student Routes */}
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

      {/* 404 - Catch all route */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  )
}

