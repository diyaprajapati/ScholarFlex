import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import api from '../../services/api'

const DIFFICULTY_BANDS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
}

const BASE_SECONDS_PER_MARK = 30

const getDifficultyBand = (weightage = 1) => {
  if (weightage >= 3) return DIFFICULTY_BANDS.HARD
  if (weightage <= 1) return DIFFICULTY_BANDS.EASY
  return DIFFICULTY_BANDS.MEDIUM
}

const getEasierBand = (band) => {
  if (band === DIFFICULTY_BANDS.HARD) return DIFFICULTY_BANDS.MEDIUM
  if (band === DIFFICULTY_BANDS.MEDIUM) return DIFFICULTY_BANDS.EASY
  return DIFFICULTY_BANDS.EASY
}

const getHarderBand = (band) => {
  if (band === DIFFICULTY_BANDS.EASY) return DIFFICULTY_BANDS.MEDIUM
  if (band === DIFFICULTY_BANDS.MEDIUM) return DIFFICULTY_BANDS.HARD
  return DIFFICULTY_BANDS.HARD
}

const shuffleArray = (array = []) => {
  const items = [...array]
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export default function StudentTestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { testId, testName, attemptId } = location.state || {}

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(3600)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [testStarted, setTestStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [questions, setQuestions] = useState([])
  const [totalQuestionTarget, setTotalQuestionTarget] = useState(0)
  const [testInfo, setTestInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [violationTriggered, setViolationTriggered] = useState(false)
  const [warningCount, setWarningCount] = useState(0)
  const intervalRef = useRef(null)
  const warningCountRef = useRef(0)
  const violationTriggeredRef = useRef(false)
  const questionLookupRef = useRef(new Map())
  const bucketsRef = useRef({
    [DIFFICULTY_BANDS.EASY]: [],
    [DIFFICULTY_BANDS.MEDIUM]: [],
    [DIFFICULTY_BANDS.HARD]: [],
  })
  const questionTimingsRef = useRef(new Map())
  const currentQuestionStartRef = useRef(null)
  const testStartTimeRef = useRef(null)
  const totalDurationSecondsRef = useRef(3600)

  const pickFromBuckets = useCallback((preferredBands = []) => {
    const buckets = bucketsRef.current
    const lookup = questionLookupRef.current
    for (const band of preferredBands) {
      if (!band) continue
      const bucket = buckets[band]
      if (bucket && bucket.length > 0) {
        const nextId = bucket.pop()
        const nextQuestion = lookup.get(nextId)
        if (nextQuestion) {
          return nextQuestion
        }
      }
    }
    return null
  }, [])

  const pickAdaptiveNextQuestion = useCallback((currentQuestion, timeSpentSeconds = 0) => {
    if (!currentQuestion) return null
    const currentBand = getDifficultyBand(currentQuestion.weightage)
    const threshold = (currentQuestion.weightage || 1) * BASE_SECONDS_PER_MARK

    let preferredBands
    if (timeSpentSeconds > threshold * 1.2) {
      preferredBands = [
        getEasierBand(currentBand),
        currentBand,
        getHarderBand(currentBand),
      ]
    } else if (timeSpentSeconds < threshold * 0.8) {
      preferredBands = [
        getHarderBand(currentBand),
        currentBand,
        getEasierBand(currentBand),
      ]
    } else {
      preferredBands = [
        currentBand,
        getHarderBand(currentBand),
        getEasierBand(currentBand),
      ]
    }

    const nextQuestion = pickFromBuckets(preferredBands)
    if (nextQuestion) {
      return nextQuestion
    }

    return pickFromBuckets([
      DIFFICULTY_BANDS.MEDIUM,
      DIFFICULTY_BANDS.EASY,
      DIFFICULTY_BANDS.HARD,
    ])
  }, [pickFromBuckets])

  const recordTimeForQuestion = useCallback((questionId) => {
    if (!questionId || !currentQuestionStartRef.current) return 0
    const timeSpent = (Date.now() - currentQuestionStartRef.current) / 1000
    questionTimingsRef.current.set(questionId, timeSpent)
    return timeSpent
  }, [])

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

    if (!testId || !attemptId) {
      navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })
      return
    }

    const fetchTestDetails = async () => {
      setIsLoading(true)
      try {
        const response = await api.studentTests.getDetails(testId, attemptId)
        const data = response.data
        const normalizedQuestions = (data.questions || []).map((question) => ({
          ...question,
          options: (question.options || []).map((option, idx) => ({
            ...option,
            originalIndex: typeof option.originalIndex === 'number' ? option.originalIndex : idx,
          })),
        }))

        if (normalizedQuestions.length === 0) {
          throw new Error('No questions available for this test')
        }

        const questionLookup = new Map()
        const bucketData = {
          [DIFFICULTY_BANDS.EASY]: [],
          [DIFFICULTY_BANDS.MEDIUM]: [],
          [DIFFICULTY_BANDS.HARD]: [],
        }

        normalizedQuestions.forEach((question) => {
          questionLookup.set(question.id, question)
          const band = getDifficultyBand(question.weightage)
          bucketData[band].push(question.id)
        })

        bucketData[DIFFICULTY_BANDS.EASY] = shuffleArray(bucketData[DIFFICULTY_BANDS.EASY])
        bucketData[DIFFICULTY_BANDS.MEDIUM] = shuffleArray(bucketData[DIFFICULTY_BANDS.MEDIUM])
        bucketData[DIFFICULTY_BANDS.HARD] = shuffleArray(bucketData[DIFFICULTY_BANDS.HARD])

        const selectInitialQuestionId = () => {
          const preferredOrder = [
            DIFFICULTY_BANDS.MEDIUM,
            DIFFICULTY_BANDS.EASY,
            DIFFICULTY_BANDS.HARD,
          ]
          for (const band of preferredOrder) {
            if (bucketData[band] && bucketData[band].length > 0) {
              const questionId = bucketData[band].pop()
              return questionLookup.get(questionId) || null
            }
          }
          return null
        }

        const initialQuestion = selectInitialQuestionId()
        if (!initialQuestion) {
          throw new Error('Unable to prepare the first question for this test')
        }

        questionLookupRef.current = questionLookup
        bucketsRef.current = bucketData
        questionTimingsRef.current = new Map()
        currentQuestionStartRef.current = null

        const totalTarget = data.total_questions || normalizedQuestions.length
        setTotalQuestionTarget(totalTarget)
        setTestInfo({
          ...data,
          total_questions: totalTarget,
        })
        setQuestions([initialQuestion])
        setCurrentQuestionIndex(0)
        setSelectedAnswers({})
        const durationSeconds = (data.duration_minutes || 60) * 60
        totalDurationSecondsRef.current = durationSeconds
        setTimeRemaining(durationSeconds)
        setFetchError(null)
      } catch (error) {
        console.error('Error fetching test details:', error)
        setFetchError(error.message || 'Failed to load test. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestDetails()
  }, [navigate, testId, attemptId])

  const submitTestPayload = useCallback(async ({ force = false } = {}) => {
    if (isSubmitting && !force) return
    setIsSubmitting(true)
    try {
      const answers = questions
        .map((question) => {
          const answer = selectedAnswers[question.id]
          if (question.type === 'multiple-choice') {
            if (Array.isArray(answer) && answer.length > 0) {
              return { question_id: question.id, selected_option_indexes: answer }
            }
            return null
          }
          if (false) { // short-answer removed
            if (typeof answer === 'string' && answer.trim() !== '') {
              return { question_id: question.id, answer_text: answer.trim() }
            }
            return null
          }
          if (typeof answer === 'number') {
            return { question_id: question.id, selected_option_index: answer }
          }
          return null
        })
        .filter(Boolean)

      const response = await api.studentTests.submit(attemptId, { answers })
      navigate(ROUTES.STUDENT.SUBMISSION, {
        replace: true,
      })
    } catch (error) {
      console.error('Error submitting test:', error)
      alert(error.message || 'Failed to submit test. Please try again.')
      setIsSubmitting(false)
    }
  }, [attemptId, isSubmitting, navigate, questions, selectedAnswers])

  const handleAutoSubmit = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (questions[currentQuestionIndex]) {
      recordTimeForQuestion(questions[currentQuestionIndex].id)
    }
    submitTestPayload({ force: true })
  }, [submitTestPayload, questions, currentQuestionIndex, recordTimeForQuestion])

  // Timer effect - uses elapsed time calculation to handle sleep/wake
  useEffect(() => {
    if (!testStarted || !testStartTimeRef.current) return

    const updateTimer = () => {
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - testStartTimeRef.current) / 1000)
      const remaining = Math.max(0, totalDurationSecondsRef.current - elapsedSeconds)
      
      setTimeRemaining(remaining)
      
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        handleAutoSubmit()
      }
    }

    // Initial calculation
    updateTimer()

    // Update every second
    intervalRef.current = setInterval(updateTimer, 1000)

    // Handle visibility change (page wake/sleep)
    const handleVisibilityChange = () => {
      if (!document.hidden && testStarted && testStartTimeRef.current) {
        // Recalculate time when page becomes visible (wakes from sleep)
        updateTimer()
      }
    }

    // Handle page focus (another way to detect wake)
    const handleFocus = () => {
      if (testStarted && testStartTimeRef.current) {
        updateTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [testStarted, handleAutoSubmit])

  // Sync violationTriggered ref with state
  useEffect(() => {
    violationTriggeredRef.current = violationTriggered
  }, [violationTriggered])

  const handleStartTest = () => {
    testStartTimeRef.current = Date.now()
    setTestStarted(true)
    setWarningCount(0) // Reset warning count when test starts
    warningCountRef.current = 0 // Reset ref as well
    violationTriggeredRef.current = false // Reset violation ref as well
    currentQuestionStartRef.current = Date.now()
  }

  const handleOptionSelect = (question, optionIndex, isMultiple = question.type === 'multiple-choice') => {
    if (typeof optionIndex !== 'number') return
    setSelectedAnswers((prev) => {
      const current = prev[question.id]
      if (isMultiple) {
        const currentArray = Array.isArray(current) ? current : []
        const exists = currentArray.includes(optionIndex)
        const updated = exists ? currentArray.filter((idx) => idx !== optionIndex) : [...currentArray, optionIndex].sort((a, b) => a - b)
        return { ...prev, [question.id]: updated }
      }
      return { ...prev, [question.id]: optionIndex }
    })
  }

  const handleNext = () => {
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return

    const timeSpent = recordTimeForQuestion(currentQuestion.id)

    if (currentQuestionIndex === questions.length - 1) {
      const nextQuestion = pickAdaptiveNextQuestion(currentQuestion, timeSpent)
      if (nextQuestion) {
        setQuestions((prev) => [...prev, nextQuestion])
        setCurrentQuestionIndex((idx) => {
          const nextIndex = idx + 1
          currentQuestionStartRef.current = Date.now()
          return nextIndex
        })
        return
      }
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((idx) => {
        const nextIndex = Math.min(idx + 1, questions.length - 1)
        currentQuestionStartRef.current = Date.now()
        return nextIndex
      })
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      recordTimeForQuestion(questions[currentQuestionIndex]?.id)
      setCurrentQuestionIndex((idx) => {
        const nextIndex = Math.max(idx - 1, 0)
        currentQuestionStartRef.current = Date.now()
        return nextIndex
      })
    }
  }

  const handleSubmitTest = () => {
    if (questions[currentQuestionIndex]) {
      recordTimeForQuestion(questions[currentQuestionIndex].id)
    }
    setShowConfirmModal(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmModal(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    await submitTestPayload()
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
  const currentAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : null
  const isQuestionAnswered = useMemo(() => {
    if (!currentQuestion) return false
    if (currentQuestion.type === 'multiple-choice') {
      return Array.isArray(currentAnswer) && currentAnswer.length > 0
    }
    if (false) { // short-answer removed
      return typeof currentAnswer === 'string' && currentAnswer.trim() !== ''
    }
    return typeof currentAnswer === 'number'
  }, [currentQuestion, currentAnswer])

  // Tab switching prevention - must be before early returns
  useEffect(() => {
    if (!testStarted) return

    const handleViolation = () => {
      if (!testStarted) return
      
      warningCountRef.current += 1
      const newWarningCount = warningCountRef.current
      setWarningCount(newWarningCount)

      // Show warnings but don't auto-submit
      if (newWarningCount >= 2) {
        violationTriggeredRef.current = true
        setViolationTriggered(true)
        alert('Final Warning: You have violated the test rules multiple times. Please stay on this page and focus on the test.')
      } else {
        alert(`Warning ${newWarningCount}: Switching tabs or leaving the page is not allowed. Please stay on this page and focus on the test.`)
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && testStarted) {
        handleViolation()
      }
    }

    const handleWindowBlur = () => {
      if (testStarted) {
        handleViolation()
      }
    }

    const handleBeforeUnload = (event) => {
      if (testStarted) {
        handleViolation()
        event.preventDefault()
        event.returnValue = ''
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [testStarted])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#4C763B] border-t-transparent"></div>
          <p className="mt-3 text-sm text-gray-600">Loading test...</p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border border-red-200 text-red-600 rounded-lg p-4 max-w-md text-center">
          <p className="text-sm mb-3">{fetchError}</p>
          <button
            onClick={() => navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#4C763B' }}
          >
            Back to Instructions
          </button>
        </div>
      </div>
    )
  }

  if (!testInfo || questions.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md text-center">
          <p className="text-sm text-gray-600">No questions available for this test.</p>
          <button
            onClick={() => navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })}
            className="mt-3 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#4C763B' }}
          >
            Back to Instructions
          </button>
        </div>
      </div>
    )
  }

  if (!testStarted) {
    return (
      <div className="h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Ready to Start?</h2>
          <div className="mb-6 text-gray-700">
            <p className="text-base sm:text-lg font-semibold">{testInfo.paper_name || testName}</p>
            <p className="text-sm sm:text-base">
              Duration: {testInfo.duration_minutes || 60} mins • Total Questions: {totalQuestionTarget || testInfo.total_questions || questions.length}
            </p>
          </div>
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
            Question {currentQuestionIndex + 1} of {totalQuestionTarget || questions.length}
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
                {currentQuestion.text}
              </h3>
            </div>

            <div className="space-y-3 sm:space-y-4">
                {currentQuestion.options.map((option, index) => {
                  const optionOriginalIndex = typeof option.originalIndex === 'number' ? option.originalIndex : index
                  const optionText = option.text || option.label || `Option ${index + 1}`
                  const isMulti = currentQuestion.type === 'multiple-choice'
                  const isSelected = isMulti
                    ? Array.isArray(currentAnswer) && currentAnswer.includes(optionOriginalIndex)
                    : currentAnswer === optionOriginalIndex
                  return (
                    <label
                      key={`${currentQuestion.id}-${optionOriginalIndex}`}
                      className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-[#4C763B] bg-[#4C763B]/10'
                          : 'border-gray-200 hover:border-[#4C763B]/40 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type={isMulti ? 'checkbox' : 'radio'}
                        name={`question-${currentQuestion.id}`}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(currentQuestion, optionOriginalIndex, isMulti)}
                        className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-[#4C763B] focus:ring-[#4C763B] focus:ring-2"
                      />
                      <div className="flex-1">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 mr-2">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span className="text-sm sm:text-base text-gray-900">{optionText}</span>
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

            {!Object.values(bucketsRef.current).some((bucket) => bucket.length > 0) && currentQuestionIndex === questions.length - 1 ? (
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

