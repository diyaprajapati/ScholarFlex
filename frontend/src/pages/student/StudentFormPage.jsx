import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import { CheckCircle, ExternalLink } from 'lucide-react'

const FORM_URL = import.meta.env.VITE_FORM_URL || 'https://forms.office.com/r/79AHpXUpur?origin=QRCode'
// const FORM_URL = import.meta.env.VITE_FORM_URL 
const FORM_STORAGE_KEY = 'student_form_completed'

export default function StudentFormPage() {
  const navigate = useNavigate()
  const [formCompleted, setFormCompleted] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const hasNavigated = useRef(false)

  useEffect(() => {
    // Prevent multiple navigation attempts
    if (hasNavigated.current) {
      return
    }

    const performChecks = () => {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        hasNavigated.current = true
        navigate(ROUTES.LOGIN, { replace: true })
        return true
      }

      // Check if user is a student
      const userRole = authService.getUserRole()
      if (userRole !== 'STUDENT') {
        hasNavigated.current = true
        navigate(ROUTES.DASHBOARD, { replace: true })
        return true
      }

      // Get user data
      const user = authService.getUser()
      if (!user?.email && !user?.id) {
        // User data not available yet
        return false
      }

      // Check if student is selected - only selected students can access this form page
      if (!user?.is_selected) {
        hasNavigated.current = true
        navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })
        return true
      }

      // Check if form is already completed
      const storageKey = `${FORM_STORAGE_KEY}_${user.email || user.id}`
      const completed = localStorage.getItem(storageKey) === 'true'
      
      if (completed) {
        // Form already completed, redirect to student dashboard (only selected students reach here)
        hasNavigated.current = true
        navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
        return true
      }

      // All checks passed, show the form
      setIsChecking(false)
      return true
    }

    // Try to perform checks immediately
    if (performChecks()) {
      return
    }

    // If user data not available, wait a bit and retry once
    const timeoutId = setTimeout(() => {
      if (!hasNavigated.current) {
        performChecks()
      }
    }, 200)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFormComplete = () => {
    const user = authService.getUser()
    if (!user?.email && !user?.id) {
      console.error('User data not available')
      return
    }
    
    const storageKey = `${FORM_STORAGE_KEY}_${user.email || user.id}`
    
    // Mark form as completed
    localStorage.setItem(storageKey, 'true')
    setFormCompleted(true)
    
    // Redirect to student dashboard after a short delay (only selected students can complete form)
    setTimeout(() => {
      navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
    }, 1500)
  }

  const handleOpenInNewTab = () => {
    window.open(FORM_URL, '_blank', 'noopener,noreferrer')
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (formCompleted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl p-8 max-w-md w-full border border-emerald-500/20">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-100 mb-2">Form Completed!</h2>
            <p className="text-gray-300 mb-6">Redirecting you to the student portal...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl p-6 mb-6 border border-emerald-500/20">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-100 mb-2">
            Welcome to ScholarFlex
          </h1>
          <p className="text-gray-300 text-sm sm:text-base">
            Before accessing the student portal, please complete the required form below.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800/90 backdrop-blur-md rounded-xl shadow-2xl border border-emerald-500/20 overflow-hidden">
          <div className="p-4 sm:p-6">
            {/* Instructions */}
            <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-sm text-gray-300">
                <strong className="text-emerald-400">Important:</strong> Please fill out the form completely. 
                Once you have submitted the form, click the "I have completed the form" button below to proceed to the student portal.
                <strong>If you already have completed the form, click the "I have completed the form" button below to proceed to the student portal.</strong>
              </p>
            </div>

            {/* Form iframe */}
            <div className="relative w-full" style={{ minHeight: '600px' }}>
              <iframe
                src={FORM_URL}
                title="Student Registration Form"
                className="w-full h-full border-0 rounded-lg"
                style={{ minHeight: '600px' }}
                allow="camera; microphone"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleOpenInNewTab}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg font-medium transition-all duration-200 border border-gray-600 hover:border-gray-500"
              >
                <ExternalLink className="w-5 h-5" />
                Open Form in New Tab
              </button>
              <button
                onClick={handleFormComplete}
                className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-900 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
              >
                I have completed the form
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

