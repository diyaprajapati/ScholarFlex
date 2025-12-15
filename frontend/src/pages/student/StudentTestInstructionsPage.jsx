import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import api from '../../services/api'

export default function StudentTestInstructionsPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [availableTests, setAvailableTests] = useState([])
  const [isLoadingTests, setIsLoadingTests] = useState(false)
  const [testsError, setTestsError] = useState(null)
  const [startingTestId, setStartingTestId] = useState(null)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)
    
    // Check if user is student
    const userRole = authService.getUserRole()
    if (userRole !== 'STUDENT') {
      navigate(ROUTES.DASHBOARD, { replace: true })
      return
    }

    // If student is selected, redirect to dashboard
    if (userData?.is_selected) {
      navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
      return
    }

    const fetchTests = async () => {
      setIsLoadingTests(true)
      try {
        const response = await api.studentTests.getAvailable()
        setAvailableTests(response.data || [])
        setTestsError(null)
      } catch (error) {
        console.error('Error fetching available tests:', error)
        setTestsError(error.message || 'Failed to load available tests.')
      } finally {
        setIsLoadingTests(false)
      }
    }

    fetchTests()
  }, [navigate])

  // Periodic check for is_selected status changes
  useEffect(() => {
    if (!authService.isAuthenticated() || !authService.isStudent()) {
      return
    }

    const checkUserStatus = async () => {
      try {
        const response = await api.auth.getCurrentUser()
        if (response.success && response.user) {
          const currentUser = response.user
          const storedUser = authService.getUser()
          
          if (storedUser) {
            const updatedUser = {
              ...storedUser,
              is_selected: currentUser.is_selected,
              can_retest: currentUser.can_retest,
            }
            authService.updateUser({
              is_selected: currentUser.is_selected,
              can_retest: currentUser.can_retest,
            })
            setUser(updatedUser)

            // Redirect based on new status
            if (currentUser.is_selected) {
              // Student was selected, redirect to dashboard
              navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
            }
            // If deselected, stay on instructions page (which is correct)
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error)
        // If user was removed/deactivated, clear auth and send to login
        authService.logout()
        navigate(ROUTES.LOGIN, { replace: true })
      }
    }

    // Check immediately
    checkUserStatus()

    // Set up interval to check every 5 seconds
    const intervalId = setInterval(checkUserStatus, 5000)

    // Cleanup interval on unmount
    return () => clearInterval(intervalId)
  }, [navigate])

  const handleStartTest = async (test) => {
    setStartingTestId(test.id)
    try {
      const response = await api.studentTests.start(test.id)
      const attemptId = response.data?.attempt_id
      navigate(ROUTES.STUDENT.TEST, { state: { testId: test.id, testName: test.paper_name, attemptId } })
    } catch (error) {
      const message = error?.message || 'Failed to start test. Please try again.'
      alert(message)
    } finally {
      setStartingTestId(null)
    }
  }

  const instructions = [
    {
      icon: (
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: "Your Test Will be For 1 Hour (60 Minutes)"
    },
    {
      icon: (
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      text: "Total 50 Questions Will Be There"
    },
    {
      icon: (
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: "Test Will Be Auto-Submitted After Time Completion"
    },
    {
      icon: (
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      text: "Do Not Close or Refresh the Browser During the Test"
    },
    {
      icon: (
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      text: "You Can Review and Change Your Answers Before Submission"
    },
    {
      icon: (
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      text: "Ensure Stable Internet Connection Throughout the Test"
    },
    {
      icon: (
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: "Read Each Question Carefully Before Answering"
    },
  ]

  const nextTestToStart =
    availableTests.find(test => !(test.is_attempted && !user?.can_retest)) ||
    availableTests[0] ||
    null

  return (
    <div className="bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-2 sm:p-3 lg:p-4 h-full">
      <div className="w-full max-w-6xl h-full flex flex-col justify-center">
        {/* Header Section */}
        <div className="text-center mb-2 sm:mb-3 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-linear-to-br from-[#4C763B]/20 to-[#B0CE88]/20 mb-1.5 sm:mb-2 shadow-md animate-float">
            <svg className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-0.5">
            Welcome to Your Aptitude Test
          </h1>
          <p className="text-xs text-gray-600">
            Please read all instructions carefully before starting the test
          </p>
        </div>

        {/* Available Tests */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-100 p-3 sm:p-4 lg:p-5 mb-2 sm:mb-3">
          <div className="mb-2">
            <h2 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">Available Tests for Your Domain</h2>
            <p className="text-[10px] sm:text-xs text-gray-600">Select a test assigned to your domain to begin</p>
          </div>

          {isLoadingTests ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#4C763B] border-t-transparent"></div>
              <p className="mt-2 text-xs text-gray-500">Loading tests...</p>
            </div>
          ) : testsError ? (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
              {testsError}
            </div>
          ) : availableTests.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg px-3 py-2">
              No tests available for your domain right now. Please check back later.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableTests.map((test) => (
                <div key={test.id} className="border border-gray-200 rounded-lg p-3 hover:border-[#4C763B]/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{test.paper_name}</h3>
                      <p className="text-[11px] text-gray-500">{test.subject || 'General'} • {test.semester || 'N/A'}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${test.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      {test.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-600 mb-2">
                    <span>Duration: {test.duration_minutes || 60} mins</span>
                    <span>Questions: 50</span>
                  </div>

                  {test.is_attempted && !user?.can_retest ? (
                    <div className="text-[11px] text-[#4C763B] bg-[#4C763B]/10 border border-[#4C763B]/30 rounded-lg px-2 py-1">
                      Attempted
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartTest(test)}
                      disabled={startingTestId === test.id}
                      className={`w-full text-xs font-semibold text-white rounded-lg py-1.5 mt-2 transition-colors ${
                        startingTestId === test.id
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#4C763B] hover:bg-[#043915]'
                      }`}
                    >
                      {startingTestId === test.id ? 'Starting...' : 'Start This Test'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions Card */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-100 p-2 sm:p-2.5 lg:p-3 mb-2 sm:mb-2.5 animate-slideUp">
          <div className="mb-1.5 sm:mb-2">
            <h2 className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 mb-0.5">Test Instructions</h2>
            <p className="text-[10px] sm:text-xs text-gray-600">Important guidelines to follow during your test</p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            {instructions.map((instruction, index) => (
              <div
                key={index}
                className="flex items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-md border border-gray-200 hover:border-[#4C763B]/40 hover:bg-linear-to-r hover:from-[#4C763B]/5 hover:to-[#B0CE88]/5 transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
              <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-[#4C763B] text-sm font-bold">•</span>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-linear-to-br from-[#4C763B]/20 to-[#4C763B]/10 flex items-center justify-center text-[#4C763B]">
                    {instruction.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 leading-snug">
                    {instruction.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-linear-to-r from-[#4C763B]/10 via-[#B0CE88]/10 to-[#4C763B]/10 rounded-md border border-[#4C763B]/20 p-1.5 sm:p-2 mb-2 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#4C763B]/20 flex items-center justify-center">
              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[10px] sm:text-xs font-semibold text-[#4C763B] mb-0.5">Important Note</h3>
              <p className="text-[10px] sm:text-xs text-gray-700 leading-snug">
                Once you click "Start Test", the timer will begin immediately. Make sure you are ready and have a quiet environment to take the test. Good luck!
              </p>
            </div>
          </div>
        </div>

        {/* Start Test Button */}
        {nextTestToStart && (
          <div className="text-center animate-fadeIn">
            <button
              onClick={() => handleStartTest(nextTestToStart)}
              disabled={startingTestId === nextTestToStart.id}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 lg:px-10 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base font-bold text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-105 active:scale-95 relative overflow-hidden group"
              style={{ backgroundColor: '#4C763B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
            >
              <span className="absolute inset-0 bg-linear-to-r from-[#4C763B] to-[#043915] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <svg className="h-4 w-4 sm:h-5 sm:w-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="relative z-10">
                {startingTestId === nextTestToStart.id ? 'Starting...' : 'Start Next Available Test'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.8s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

