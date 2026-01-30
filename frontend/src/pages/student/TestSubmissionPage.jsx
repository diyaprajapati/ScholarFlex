import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'

export default function TestSubmissionPage() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          authService.logout()
          navigate(ROUTES.LOGIN, { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-3xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-linear-to-br from-[#4C763B]/20 to-[#B0CE88]/20 mb-6 shadow-lg">
            <svg className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Test Submitted Successfully!
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Your responses have been recorded. Results will be reviewed by the admin team and shared separately.
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-dashed border-[#4C763B]/40 mb-8">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            Thank you for completing the test. Please note that scores and detailed feedback are not shown here. 
            The administration team will evaluate all attempts and communicate your results through the official channels.
          </p>
        </div>

        <div className="text-center space-y-3">
          <p className="text-sm text-gray-600">
            You will be logged out automatically in{' '}
            <span className="font-semibold text-[#4C763B]">{countdown}</span> seconds.
          </p>
          <button
            onClick={() => navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })}
            className="px-6 py-3 text-sm sm:text-base font-semibold text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            style={{ backgroundColor: '#4C763B' }}
          >
            Back to Instructions
          </button>
        </div>
      </div>
    </div>
  )
}

