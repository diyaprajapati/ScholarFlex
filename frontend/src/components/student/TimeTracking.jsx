import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Pause, Clock, AlertCircle, X } from 'lucide-react';
import api from '../../services/api';
import {
  registerServiceWorker,
  requestNotificationPermission,
  showBackgroundNotification
} from '../../utils/notificationService';

const TimeTracking = () => {
  const [session, setSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [nextQuestionTime, setNextQuestionTime] = useState(null);
  const [todayHours, setTodayHours] = useState(null);
  const [loadingToday, setLoadingToday] = useState(false);

  const intervalRef = useRef(null);
  const questionIntervalRef = useRef(null);
  const timeUpdateRef = useRef(null);
  const sessionRef = useRef(null);
  const questionTimeoutRef = useRef(null);
  const showQuestionRef = useRef(false);
  const currentQuestionRef = useRef(null);

  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Format time as hours and minutes
  const formatTimeReadable = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Keep refs in sync with state for use in timeouts
  useEffect(() => {
    showQuestionRef.current = showQuestion;
  }, [showQuestion]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // Check for pending questions stored in localStorage
  const checkForPendingQuestion = async () => {
    try {
      const pendingQuestion = localStorage.getItem('pendingAttendanceQuestion');
      if (pendingQuestion) {
        const questionData = JSON.parse(pendingQuestion);
        const questionTime = new Date(questionData.askedAt);
        const now = new Date();
        const minutesSinceAsked = Math.floor((now - questionTime) / (1000 * 60));

        // If question was asked less than 30 minutes ago, show it
        if (minutesSinceAsked < 30) {
          setCurrentQuestion(questionData);
          setShowQuestion(true);
          setAnswer('');
          setQuestionError('');
          // Focus window to bring attention
          window.focus();
        } else {
          // Question is too old, remove it
          localStorage.removeItem('pendingAttendanceQuestion');
        }
      }
    } catch (error) {
      console.error('Error checking pending question:', error);
    }
  };

  // Setup on mount
  useEffect(() => {
    // Register service worker (but don't request permission yet)
    registerServiceWorker();

    // Listen for Service Worker messages (for notification clicks)
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event) => {
        if (event.data && event.data.type === 'SHOW_ATTENDANCE_MODAL') {
          // Show modal when notification is clicked
          checkForPendingQuestion();
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      // Also listen for when service worker becomes ready
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('message', handleServiceWorkerMessage);
      });
    }

    loadActiveSession();
    loadTodayHours();

    // Check for pending questions when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible - check for pending questions
        checkForPendingQuestion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also check periodically for pending questions (in case tab was closed)
    const pendingCheckInterval = setInterval(() => {
      if (!document.hidden) {
        checkForPendingQuestion();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pendingCheckInterval);
    };
  }, []);

  // Load active session
  const loadActiveSession = async () => {
    try {
      const response = await api.timeTracking.getActive();
      if (response.success && response.session) {
        setSession(response.session);
        sessionRef.current = response.session;
        const startTime = new Date(response.session.startTime);
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);

        // Only start tracking if session is active (not paused)
        if (response.session.status === 'ACTIVE') {
          // Calculate next question time (every 10 minutes)
          const lastQuestionTime = response.session.attendanceQuestions?.length > 0
            ? new Date(response.session.attendanceQuestions[0].askedAt)
            : startTime;
          const minutesSinceLastQuestion = Math.floor((now - lastQuestionTime) / (1000 * 60));
          const minutesUntilNext = 10 - (minutesSinceLastQuestion % 10);
          setNextQuestionTime(minutesUntilNext);

          startTimeTracking();
        }
      }

      // Also load today's hours
      loadTodayHours();
    } catch (error) {
      console.error('Error loading active session:', error);
    }
  };

  // Start time tracking
  const startTimeTracking = () => {
    // Clear any existing intervals
    if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
    if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);

    // Update elapsed time every second (always, regardless of tab focus)
    // Update elapsed time by calculating difference from start time
    // This prevents drift when the tab is inactive/throttled
    timeUpdateRef.current = setInterval(() => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE') {
        const startTime = new Date(sessionRef.current.startTime);
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }
    }, 1000);

    // Check for questions every minute (always, regardless of tab focus)
    questionIntervalRef.current = setInterval(() => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE') {
        checkForQuestion();
      }
    }, 60000); // Check every minute

    // Initial check after a short delay to ensure session is set
    setTimeout(() => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE') {
        checkForQuestion();
      }
    }, 2000);
  };

  // Check if it's time to ask a question (every 10 minutes)
  const checkForQuestion = async () => {
    const currentSession = sessionRef.current;
    if (!currentSession || showQuestion || currentSession.status !== 'ACTIVE') return;

    const startTime = new Date(currentSession.startTime);
    const now = new Date();

    // Check if 10 minutes have passed since session start or last question
    const lastQuestionTime = currentSession.attendanceQuestions?.length > 0
      ? new Date(currentSession.attendanceQuestions[0].askedAt)
      : startTime;
    const minutesSinceLastQuestion = Math.floor((now - lastQuestionTime) / (1000 * 60));

    if (minutesSinceLastQuestion >= 10) {
      askQuestion();
    } else {
      // Update next question time
      const minutesUntilNext = 10 - (minutesSinceLastQuestion % 10);
      setNextQuestionTime(minutesUntilNext);
    }
  };

  // Ask a question
  const askQuestion = async () => {
    try {
      setLoading(true);
      const response = await api.timeTracking.askQuestion();
      if (response.success) {
        const questionData = {
          ...response.question,
          askedAt: new Date().toISOString(),
        };

        setCurrentQuestion(questionData);
        setShowQuestion(true);
        setAnswer('');
        setQuestionError('');

        // Store question in localStorage so it persists even if tab is closed
        localStorage.setItem('pendingAttendanceQuestion', JSON.stringify(questionData));

        // Show background notification with generic message (works even when tab/window is closed)
        // Pass callback to show modal when notification is clicked
        console.log('Attempting to show notification...');
        try {
          const notificationShown = await showBackgroundNotification(() => {
            // This callback will be called when notification is clicked
            setShowQuestion(true);
            setCurrentQuestion(questionData);
            window.focus();
          });
          console.log('Notification result:', notificationShown);

          // If notification failed, try again after ensuring Service Worker is ready
          if (!notificationShown && 'serviceWorker' in navigator) {
            console.log('Retrying notification after Service Worker ready...');
            const registration = await navigator.serviceWorker.ready;
            setTimeout(async () => {
              await showBackgroundNotification(() => {
                setShowQuestion(true);
                setCurrentQuestion(questionData);
                window.focus();
              });
            }, 500);
          }
        } catch (error) {
          console.error('Error showing notification:', error);
        }

        // Focus the window to bring attention (if tab is open)
        if (!document.hidden) {
          window.focus();
        }

        // Set timeout: if no answer within 2 minutes, stop the session automatically
        if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
        questionTimeoutRef.current = setTimeout(async () => {
          try {
            // Use refs to get the latest values
            const hasUnansweredQuestion = showQuestionRef.current && currentQuestionRef.current;
            const activeSession = sessionRef.current;

            if (hasUnansweredQuestion && activeSession) {
              // Notify the user that the session was stopped due to no response
              await showBackgroundNotification(() => {
                window.focus();
              });

              // Stop the session without asking for confirmation
              const response = await api.timeTracking.finish();
              if (response.success) {
                // Clear intervals
                if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
                if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);

                // Clear question and session state
                setSession(null);
                sessionRef.current = null;
                setElapsedTime(0);
                setShowQuestion(false);
                showQuestionRef.current = false;
                setCurrentQuestion(null);
                currentQuestionRef.current = null;
                setNextQuestionTime(null);
                localStorage.removeItem('pendingAttendanceQuestion');

                // Reload today's hours
                loadTodayHours();
              }
            }
          } catch (error) {
            console.error('Error auto-stopping session after unanswered question:', error);
          }
        }, 120000); // 2 minutes
      }
    } catch (error) {
      console.error('Error asking question:', error);
      setQuestionError(error.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  // Handle start session
  const handleStart = async () => {
    try {
      setLoading(true);

      // Request notification permission when Start is clicked
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        alert('Please allow notifications to receive attendance check reminders.');
        // Continue anyway - they can still track time
      }

      const response = await api.timeTracking.start();
      if (response.success) {
        setSession(response.session);
        sessionRef.current = response.session;

        // Calculate initial elapsed time based on server response
        const startTime = new Date(response.session.startTime);
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);

        setNextQuestionTime(10);
        startTimeTracking();
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert(error.message || 'Failed to start time tracking');
    } finally {
      setLoading(false);
    }
  };

  // Load today's working hours
  const loadTodayHours = async () => {
    try {
      setLoadingToday(true);
      const response = await api.timeTracking.getToday();
      if (response.success) {
        setTodayHours(response);
      }
    } catch (error) {
      console.error('Error loading today hours:', error);
    } finally {
      setLoadingToday(false);
    }
  };

  // Handle pause session
  const handlePause = async () => {
    if (!session || session.status === 'PAUSED') return;

    try {
      setLoading(true);
      const response = await api.timeTracking.pause();
      if (response.success) {
        setSession(response.session);
        sessionRef.current = response.session;
        // Clear intervals when paused
        if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
        if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
      }
    } catch (error) {
      console.error('Error pausing session:', error);
      alert(error.message || 'Failed to pause time tracking');
    } finally {
      setLoading(false);
    }
  };

  // Handle resume session
  const handleResume = async () => {
    if (!session || session.status !== 'PAUSED') return;

    try {
      setLoading(true);
      const response = await api.timeTracking.resume();
      if (response.success) {
        setSession(response.session);
        sessionRef.current = response.session;
        // Restart time tracking
        startTimeTracking();
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      alert(error.message || 'Failed to resume time tracking');
    } finally {
      setLoading(false);
    }
  };

  // Handle stop session
  const handleStop = async () => {
    if (!session) return;

    // Check if there's an unanswered question
    if (showQuestion && currentQuestion) {
      alert('Please answer the current question before stopping the session.');
      return;
    }

    if (!window.confirm('Are you sure you want to stop the time tracking session? This will save today\'s working hours.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.timeTracking.finish();
      if (response.success) {
        // Clear intervals
        if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
        if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);

        setSession(null);
        sessionRef.current = null;
        setElapsedTime(0);
        setShowQuestion(false);
        setCurrentQuestion(null);
        setNextQuestionTime(null);

        // Reload today's hours
        loadTodayHours();

        const totalMinutes = response.session.totalMinutes || 0;
        alert(`Session stopped! Total time: ${formatTimeReadable(totalMinutes * 60)}`);
      }
    } catch (error) {
      console.error('Error stopping session:', error);
      alert(error.message || 'Failed to stop time tracking');
    } finally {
      setLoading(false);
    }
  };

  // Handle answer submission
  const handleAnswerSubmit = async (e) => {
    e.preventDefault();

    if (!answer.trim()) {
      setQuestionError('Please enter an answer');
      return;
    }

    try {
      setLoading(true);
      setQuestionError('');
      const response = await api.timeTracking.answerQuestion(currentQuestion.id, answer.trim());

      if (response.success) {
        const isCorrect = response.question.isCorrect;
        setShowQuestion(false);
        setCurrentQuestion(null);
        setAnswer('');

        // Update session state with new question
        setSession((prevSession) => {
          if (!prevSession) return prevSession;
          const updatedSession = {
            ...prevSession,
            attendanceQuestions: [
              response.question,
              ...(prevSession.attendanceQuestions || []),
            ],
          };
          sessionRef.current = updatedSession;
          return updatedSession;
        });

        // Clear timeout
        if (questionTimeoutRef.current) {
          clearTimeout(questionTimeoutRef.current);
          questionTimeoutRef.current = null;
        }

        // Remove pending question from localStorage
        localStorage.removeItem('pendingAttendanceQuestion');

        // Reset next question timer
        setNextQuestionTime(10);

        if (isCorrect) {
          // Show brief success message
          setTimeout(() => {
            alert('Thanks! ✅');
          }, 100);
        } else {
          alert('Please make sure you are actively working. The answer was not recognized.');
        }
      }
    } catch (error) {
      console.error('Error answering question:', error);
      setQuestionError(error.message || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
      if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
      if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
    };
  }, []);


  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-green-600" />
          Time Tracking
        </h2>
        {session && (
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              {session.status === 'PAUSED' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  ⏸️ Paused
                </span>
              )}
              <div className={`text-2xl sm:text-3xl font-bold ${session.status === 'PAUSED' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                {formatTime(elapsedTime)}
              </div>
            </div>
            {nextQuestionTime !== null && nextQuestionTime > 0 && session.status === 'ACTIVE' && (
              <div className="text-xs sm:text-sm text-gray-500 mt-1">
                Next check in {nextQuestionTime} min
              </div>
            )}
            {showQuestion && currentQuestion && (
              <div className="text-xs sm:text-sm text-red-600 mt-1 font-medium">
                ⚠️ Question pending - Please answer
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's Working Hours */}
      {todayHours && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Today's Working Hours:</span>
            <span className="text-lg font-bold text-blue-600">
              {todayHours.totalHours} hours
            </span>
          </div>
          {todayHours.sessionsCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {todayHours.sessionsCount} session{todayHours.sessionsCount !== 1 ? 's' : ''} completed
            </p>
          )}
        </div>
      )}

      {!session ? (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">Click Start to begin tracking your time</p>
          <button
            onClick={handleStart}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? 'Starting...' : 'Start'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            {session.status === 'PAUSED' ? (
              <button
                onClick={handleResume}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                {loading ? 'Resuming...' : 'Resume'}
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Pause className="w-4 h-4 mr-2" />
                {loading ? 'Pausing...' : 'Pause'}
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Square className="w-4 h-4 mr-2" />
              {loading ? 'Stopping...' : 'Stop'}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            {session.status === 'PAUSED' ? (
              <span className="text-yellow-600 font-medium">⏸️ Session Paused</span>
            ) : (
              <span>Session started at {new Date(session.startTime).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Question Modal - Always visible, even when tab not focused */}
      {showQuestion && currentQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-9999 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-pulse border-4 border-red-500 ring-4 ring-red-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-blue-600">
                <AlertCircle className="w-5 h-5 mr-2 animate-bounce" />
                <h3 className="text-lg font-semibold">Quick Check</h3>
              </div>
              <button
                onClick={() => {
                  // Don't allow closing without answering
                  alert('Please answer the question to continue tracking your time.');
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4 text-sm">
              Just verifying you're still here! 😊
            </p>

            <div className="mb-4 bg-blue-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900 text-lg">
                {currentQuestion.questionText}
              </p>
            </div>

            <form onSubmit={handleAnswerSubmit}>
              <input
                type="text"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setQuestionError('');
                }}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAnswerSubmit(e);
                  }
                }}
              />

              {questionError && (
                <p className="text-red-600 text-sm mb-2">{questionError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !answer.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 Tip: You can press Enter to submit
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTracking;

