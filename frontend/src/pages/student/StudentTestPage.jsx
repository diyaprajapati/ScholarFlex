import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'

export default function StudentTestPage() {
  const navigate = useNavigate()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(3600) // 1 hour in seconds (60 * 60)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [testStarted, setTestStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const intervalRef = useRef(null)

  // Mock questions data (50 questions)
  const questions = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    question: `Question ${i + 1}: What is the answer to this question? This is a sample question for testing purposes.`,
    options: [
      `Option A for Question ${i + 1}`,
      `Option B for Question ${i + 1}`,
      `Option C for Question ${i + 1}`,
      `Option D for Question ${i + 1}`
    ],
    correctAnswer: i % 4, // Mock correct answer (0-3)
    weightage: 2
  }))

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    
    const userRole = authService.getUserRole()
    if (userRole !== 'STUDENT') {
      navigate(ROUTES.DASHBOARD, { replace: true })
      return
    }
  }, [navigate])

  const handleAutoSubmit = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsSubmitting(true)
    // Auto submit logic here
    setTimeout(() => {
      navigate(ROUTES.STUDENT.SUBMISSION, { replace: true })
    }, 1000)
  }, [navigate])

  useEffect(() => {
    // Start timer when test starts
    if (testStarted) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [testStarted, handleAutoSubmit])

  const handleStartTest = () => {
    setTestStarted(true)
  }

  const handleAnswerSelect = (questionId, answerIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmitTest = () => {
    setShowConfirmModal(true)
  }

  const confirmSubmit = () => {
    setShowConfirmModal(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsSubmitting(true)
    // Submit logic here
    setTimeout(() => {
      navigate(ROUTES.STUDENT.SUBMISSION, { replace: true })
    }, 1000)
  }

  const cancelSubmit = () => {
    setShowConfirmModal(false)
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isAnswered = selectedAnswers[currentQuestion.id] !== undefined

  if (!testStarted) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Ready to Start?</h2>
          <div className="mb-8">
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 italic leading-relaxed">
              "You don't need to know everything to begin — you just need the courage to start writing your first line of code."
            </p>
          </div>
          <button
            onClick={handleStartTest}
            className="px-8 py-3 bg-[#4C763B] text-white rounded-lg font-bold hover:bg-[#043915] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Test Now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Timer Bar - Fixed at Top */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium text-gray-700">Time Remaining:</span>
            </div>
            <div className={`text-lg sm:text-xl lg:text-2xl font-bold font-mono ${
              timeRemaining <= 300 ? 'text-red-600' : timeRemaining <= 600 ? 'text-orange-600' : 'text-[#4C763B]'
            }`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Question Card */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-gray-100 p-4 sm:p-6 lg:p-8 mb-6">
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#4C763B] text-white text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded">
                  Q{currentQuestionIndex + 1}
                </span>
                <span className="text-xs sm:text-sm text-gray-500">Weightage: {currentQuestion.weightage} marks</span>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 leading-relaxed">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-3 sm:space-y-4">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswers[currentQuestion.id] === index
                return (
                  <label
                    key={index}
                    className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-[#4C763B] bg-[#4C763B]/10'
                        : 'border-gray-200 hover:border-[#4C763B]/40 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={isSelected}
                      onChange={() => handleAnswerSelect(currentQuestion.id, index)}
                      className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-[#4C763B] focus:ring-[#4C763B] focus:ring-2"
                    />
                    <div className="flex-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="text-sm sm:text-base text-gray-900">{option}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-300 ${
                currentQuestionIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </span>
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="px-6 sm:px-8 py-2 sm:py-3 bg-[#4C763B] text-white rounded-lg font-bold hover:bg-[#043915] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-[#4C763B] text-white rounded-lg font-medium hover:bg-[#043915] transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  Next
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
                <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Confirm Submission
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Are you sure you want to submit the test? You cannot change your answers after submission.
              </p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={cancelSubmit}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#4C763B] text-white rounded-lg font-medium hover:bg-[#043915] transition-all duration-200"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

