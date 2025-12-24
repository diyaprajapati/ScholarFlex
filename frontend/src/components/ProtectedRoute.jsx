import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authService } from '../utils/auth'
import { ROUTES } from '../config/paths'

export default function ProtectedRoute({ children, allowedRoles = null, requireSelected = false }) {
  const isAuthenticated = authService.isAuthenticated()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // Check if student's internship has ended
  const userRole = authService.getUserRole()
  if (userRole === 'STUDENT') {
    const user = authService.getUser()
    
    // Check if form has been completed (only if not already on form page)
    if (location.pathname !== ROUTES.STUDENT.FORM && (user?.email || user?.id)) {
      const FORM_STORAGE_KEY = 'student_form_completed'
      const storageKey = `${FORM_STORAGE_KEY}_${user.email || user.id}`
      const formCompleted = localStorage.getItem(storageKey) === 'true'
      
      if (!formCompleted) {
        // Form not completed, redirect to form page
        return <Navigate to={ROUTES.STUDENT.FORM} replace />
      }
    }
    if (user?.internship_end_date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = new Date(user.internship_end_date)
      endDate.setHours(23, 59, 59, 999)
      
      // Only redirect to feedback if internship has ended AND not already on feedback page
      if (today > endDate && location.pathname !== ROUTES.STUDENT.FEEDBACK) {
        // Redirect to feedback page if internship has ended
        return <Navigate to={ROUTES.STUDENT.FEEDBACK} replace />
      }
      
      // If internship hasn't ended but trying to access feedback page, redirect away
      if (today <= endDate && location.pathname === ROUTES.STUDENT.FEEDBACK) {
        return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />
      }
    } else {
      // No internship end date, redirect away from feedback page
      if (location.pathname === ROUTES.STUDENT.FEEDBACK) {
        return <Navigate to={ROUTES.STUDENT.DASHBOARD} replace />
      }
    }
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      // Redirect to appropriate page based on role
      if (userRole === 'STUDENT') {
        // Student should be redirected to student instructions
        return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
      } else {
        return <Navigate to={ROUTES.DASHBOARD} replace />
      }
    }

    // Check if student needs to be selected
    if (requireSelected && userRole === 'STUDENT') {
      const user = authService.getUser()
      if (!user?.is_selected) {
        // Student is not selected, redirect to test instructions page
        return <Navigate to={ROUTES.STUDENT.INSTRUCTIONS} replace />
      }
    }
  }

  return children
}

