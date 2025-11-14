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
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Question Papers Routes - Admin and Super Admin only */}
      <Route
        path={ROUTES.QUESTION_PAPERS.LIST}
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <QuestionPapersListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.QUESTION_PAPERS.ADD}
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AddQuestionPaperFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/question-papers/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AddQuestionPaperFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/question-papers/view/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <ViewQuestionPaperPage />
          </ProtectedRoute>
        }
      />

      {/* Interns Routes - Admin and Super Admin only */}
      <Route
        path={ROUTES.INTERNS.VIEW}
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AllInternsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.INTERNS.ADD}
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AddInternPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interns/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AddInternPage />
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path={ROUTES.STUDENT.INSTRUCTIONS}
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentTestInstructionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.TEST}
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentTestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.STUDENT.SUBMISSION}
        element={
          <ProtectedRoute allowedRoles={['student']}>
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

