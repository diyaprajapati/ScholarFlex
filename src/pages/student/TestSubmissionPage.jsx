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
          // Logout user
          authService.logout()
          // Navigate to login
          navigate(ROUTES.LOGIN, { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-3xl">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-[#4C763B]/20 to-[#B0CE88]/20 mb-6 shadow-lg">
            <svg className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Test Submitted Successfully!
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-8">
            Thank you for completing the test. Your answers have been saved.
          </p>
        </div>

        <div className="mb-8">
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 italic leading-relaxed">
            "Success is not final, failure is not fatal: it is the courage to continue that counts."
          </p>
        </div>

        <div className="text-sm sm:text-base text-gray-500">
          <p>You will be automatically logged out in</p>
          <p className="text-xl sm:text-2xl font-bold text-[#4C763B] mt-2">{countdown} seconds</p>
        </div>
      </div>
    </div>
  )
}

