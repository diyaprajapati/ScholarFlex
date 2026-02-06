import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Pause, Clock, AlertCircle, X } from 'lucide-react';
import api from '../../services/api';
import {
  registerServiceWorker,
  requestNotificationPermission,
  showBackgroundNotification
} from '../../utils/notificationService';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../../firebase';
import { authService } from '../../utils/auth';

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
  const heartbeatRef = useRef(null);
  const timeUpdateRef = useRef(null);
  const sessionRef = useRef(null);
  const questionTimeoutRef = useRef(null);
  const showQuestionRef = useRef(false);
  const currentQuestionRef = useRef(null);
  const pauseStartTimeRef = useRef(null);
  const pausedElapsedTimeRef = useRef(0);

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

  // Helper to clear session state locally
  const stopSessionLocally = () => {
    // Clear intervals
    if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
    if (questionIntervalRef.current) clearInterval(questionIntervalRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);

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
  };

  // Handle auto-stop session when question is not answered
  const handleAutoStopSession = async () => {
    // console.log('Auto-stopping session due to unanswered question...');

    // 1. Attempt to show notification (non-blocking)
    try {
      showBackgroundNotification(() => {
        window.focus();
      }).catch(err => console.error('Background notification failed:', err));
    } catch (error) {
      console.error('Error initiating notification:', error);
    }

    // 2. Stop the session on the backend
    try {
      const response = await api.timeTracking.finish();
      if (response.success) {
        stopSessionLocally();
      }
    } catch (error) {
      console.error('Error auto-stopping session API:', error);
      // Fallback: stop locally anyway so the user sees the timer stop
      stopSessionLocally();
    }
  };

  // Check for pending questions stored in localStorage
  const checkForPendingQuestion = async () => {
    try {
      const pendingQuestion = localStorage.getItem('pendingAttendanceQuestion');
      if (pendingQuestion) {
        const questionData = JSON.parse(pendingQuestion);
        const questionTime = new Date(questionData.askedAt);
        const now = new Date();
        const elapsedMs = now - questionTime;
        const TIMEOUT_MS = 120000; // 2 minutes

        // If question was asked less than 2 minutes ago (plus minimal grace), show it and pause timer
        if (elapsedMs < TIMEOUT_MS) {
          // PAUSE TIMER: Store current elapsed time and pause start time
          if (sessionRef.current) {
            const startTime = new Date(sessionRef.current.startTime);
            const currentElapsed = Math.floor((now - startTime) / 1000);
            pausedElapsedTimeRef.current = currentElapsed;
            pauseStartTimeRef.current = questionTime; // Use question time as pause start
          }

          setCurrentQuestion(questionData);
          setShowQuestion(true);
          setAnswer('');
          setQuestionError('');

          // Restore timeout for remaining time
          const remainingTime = TIMEOUT_MS - elapsedMs;
          if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
          questionTimeoutRef.current = setTimeout(handleAutoStopSession, remainingTime);

          // Focus window to bring attention
          window.focus();
        } else {
          // Time expired while away/refreshed - stop session
          handleAutoStopSession();
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


    loadActiveSession().then(() => {
      // Check for pending questions after session load to ensure correct state ordering
      checkForPendingQuestion();
    });
    loadTodayHours();

    // When tab becomes visible, re-check for any pending question so
    // the modal can be restored if needed. Leaving the tab should NOT
    // pause or stop the timer by itself.
    const handleVisibilityChange = () => {
      if (!document.hidden) {
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
        const pausedSeconds = (sessionRef.current.pausedMinutes || 0) * 60;
        const elapsed = Math.floor((now - startTime) / 1000) - pausedSeconds;
        setElapsedTime(Math.max(0, elapsed));

        // Only start tracking if session is active (not paused)
        if (response.session.status === 'ACTIVE') {
          // Check if there's a pending question (timer should be paused)
          const pendingQuestion = localStorage.getItem('pendingAttendanceQuestion');
          if (pendingQuestion) {
            try {
              const questionData = JSON.parse(pendingQuestion);
              const questionTime = new Date(questionData.askedAt);
              const elapsedMs = now - questionTime;
              const TIMEOUT_MS = 120000; // 2 minutes
              
              if (elapsedMs < TIMEOUT_MS) {
                // Timer is paused due to pending question
                pausedElapsedTimeRef.current = elapsed;
                pauseStartTimeRef.current = questionTime;
              }
            } catch (e) {
              console.error('Error parsing pending question:', e);
            }
          }

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
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    // Heartbeat every 1 min so backend can auto-finish if client is gone (shutdown, closed tab)
    const sendHeartbeat = () => {
      if (sessionRef.current?.status === 'ACTIVE') {
        api.timeTracking.heartbeat().catch((err) => console.error('Heartbeat failed:', err));
      }
    };
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 60000);

    // Update elapsed time every second (always, regardless of tab focus)
    // Update elapsed time by calculating difference from start time
    // This prevents drift when the tab is inactive/throttled
    // PAUSE when question is shown (don't update elapsedTime)
    timeUpdateRef.current = setInterval(() => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE' && !showQuestionRef.current) {
        const startTime = new Date(sessionRef.current.startTime);
        const now = new Date();
        const pausedSeconds = (sessionRef.current.pausedMinutes || 0) * 60;
        const elapsed = Math.floor((now - startTime) / 1000) - pausedSeconds;
        setElapsedTime(Math.max(0, elapsed));
      } else if (sessionRef.current && sessionRef.current.status === 'ACTIVE' && showQuestionRef.current) {
        // Timer is paused - keep showing the paused elapsed time
        setElapsedTime(pausedElapsedTimeRef.current);
      }
    }, 1000);

    // Check for questions every minute (always, regardless of tab focus)
    questionIntervalRef.current = setInterval(() => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE' && !showQuestionRef.current) {
        checkForQuestion();
      }
    }, 60000); // Check every minute

    // Initial check after a short delay to ensure session is set
    setTimeout(() => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE' && !showQuestionRef.current) {
        checkForQuestion();
      }
    }, 2000);
  };

  // Check if it's time to ask a question (every 10 minutes)
  const checkForQuestion = async () => {
    const currentSession = sessionRef.current;
    // Use ref for showQuestion to verify current state inside interval closure
    if (!currentSession || showQuestionRef.current || currentSession.status !== 'ACTIVE') return;

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

        // PAUSE TIMER: Store current elapsed time and pause start time
        if (sessionRef.current) {
          const startTime = new Date(sessionRef.current.startTime);
          const now = new Date();
          const currentElapsed = Math.floor((now - startTime) / 1000);
          pausedElapsedTimeRef.current = currentElapsed;
          pauseStartTimeRef.current = now;

          // Track automatic pause due to question
          if (analytics) {
            try {
              const user = authService.getUser();
              logEvent(analytics, 'timer_pause_auto', {
                user_id: user ? `user_${user.id}` : 'anonymous',
                session_id: sessionRef.current.id,
                question_id: questionData.id,
                elapsed_time_seconds: currentElapsed,
                elapsed_time_minutes: Math.round((currentElapsed / 60) * 100) / 100,
                pause_reason: 'attendance_question',
                pause_time: now.toISOString(),
                timestamp: now.toISOString()
              });
              if (import.meta.env.DEV) {
                // console.log('Timer auto-paused for question - Analytics logged, elapsed:', currentElapsed, 'seconds');
              }
            } catch (error) {
              console.error('Error logging auto pause:', error);
            }
          }
        }

        setCurrentQuestion(questionData);
        setShowQuestion(true);
        setAnswer('');
        setQuestionError('');

        // Store question in localStorage so it persists even if tab is closed
        localStorage.setItem('pendingAttendanceQuestion', JSON.stringify(questionData));

        // Show background notification with generic message (works even when tab/window is closed)
        // Pass callback to show modal when notification is clicked
        // console.log('Attempting to show notification...');
        try {
          const notificationShown = await showBackgroundNotification(() => {
            // This callback will be called when notification is clicked
            setShowQuestion(true);
            setCurrentQuestion(questionData);
            window.focus();
          });
          // console.log('Notification result:', notificationShown);

          // If notification failed, try again after ensuring Service Worker is ready
          if (!notificationShown && 'serviceWorker' in navigator) {
            // console.log('Retrying notification after Service Worker ready...');
            try {
              const registration = await navigator.serviceWorker.ready;
              // console.log('Service Worker ready for retry:', registration);
              setTimeout(async () => {
                const retryResult = await showBackgroundNotification(() => {
                  setShowQuestion(true);
                  setCurrentQuestion(questionData);
                  window.focus();
                });
                // console.log('Retry notification result:', retryResult);
              }, 1000);
            } catch (swError) {
              console.error('Service Worker ready error:', swError);
            }
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
        questionTimeoutRef.current = setTimeout(handleAutoStopSession, 120000); // 2 minutes
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

      // Ensure Service Worker is registered first
      if ('serviceWorker' in navigator) {
        try {
          await registerServiceWorker();
          // console.log('Service Worker registered for notifications');
        } catch (error) {
          console.error('Service Worker registration error:', error);
        }
      }

      // Request notification permission when Start is clicked
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        const userChoice = confirm('Notifications are required for attendance check reminders. Without notifications, you may miss important alerts. Do you want to continue without notifications?');
        if (!userChoice) {
          setLoading(false);
          return;
        }
        // Continue anyway - they can still track time, but notifications won't work
        console.warn('User declined notification permission');
      } else {
        // console.log('Notification permission granted');
      }

      const response = await api.timeTracking.start();
      if (response.success) {
        setSession(response.session);
        sessionRef.current = response.session;

        // Calculate initial elapsed time based on server response
        const startTime = new Date(response.session.startTime);
        const now = new Date();
        const pausedSeconds = (sessionRef.current.pausedMinutes || 0) * 60;
        const elapsed = Math.floor((now - startTime) / 1000) - pausedSeconds;
        setElapsedTime(Math.max(0, elapsed));

        setNextQuestionTime(10);
        startTimeTracking();

        // Track timer start event
        if (analytics) {
          try {
            const user = authService.getUser();
            logEvent(analytics, 'timer_start', {
              user_id: user ? `user_${user.id}` : 'anonymous',
              session_id: response.session.id,
              start_time: response.session.startTime,
              timestamp: new Date().toISOString()
            });
            if (import.meta.env.DEV) {
              // console.log('Timer started - Analytics logged');
            }
          } catch (error) {
            console.error('Error logging timer start:', error);
          }
        }
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
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);

        // Track timer pause event
        if (analytics) {
          try {
            const user = authService.getUser();
            const elapsedSeconds = Math.floor(elapsedTime);
            logEvent(analytics, 'timer_pause', {
              user_id: user ? `user_${user.id}` : 'anonymous',
              session_id: response.session.id,
              elapsed_time_seconds: elapsedSeconds,
              elapsed_time_minutes: Math.round((elapsedSeconds / 60) * 100) / 100,
              pause_time: new Date().toISOString(),
              timestamp: new Date().toISOString()
            });
            if (import.meta.env.DEV) {
              // console.log('Timer paused - Analytics logged, elapsed:', elapsedSeconds, 'seconds');
            }
          } catch (error) {
            console.error('Error logging timer pause:', error);
          }
        }
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

        // Track timer resume event
        if (analytics) {
          try {
            const user = authService.getUser();
            const elapsedSeconds = Math.floor(elapsedTime);
            logEvent(analytics, 'timer_resume', {
              user_id: user ? `user_${user.id}` : 'anonymous',
              session_id: response.session.id,
              elapsed_time_seconds: elapsedSeconds,
              elapsed_time_minutes: Math.round((elapsedSeconds / 60) * 100) / 100,
              resume_time: new Date().toISOString(),
              timestamp: new Date().toISOString()
            });
            if (import.meta.env.DEV) {
              // console.log('Timer resumed - Analytics logged, elapsed:', elapsedSeconds, 'seconds');
            }
          } catch (error) {
            console.error('Error logging timer resume:', error);
          }
        }
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
        stopSessionLocally();
        const totalMinutes = response.session.totalMinutes || 0;
        const totalSeconds = totalMinutes * 60;
        alert(`Session stopped! Total time: ${formatTimeReadable(totalSeconds)}`);

        // Track timer stop event
        if (analytics) {
          try {
            const user = authService.getUser();
            logEvent(analytics, 'timer_stop', {
              user_id: user ? `user_${user.id}` : 'anonymous',
              session_id: response.session.id,
              total_time_seconds: totalSeconds,
              total_time_minutes: totalMinutes,
              total_time_hours: Math.round((totalMinutes / 60) * 100) / 100,
              stop_time: new Date().toISOString(),
              timestamp: new Date().toISOString()
            });
            if (import.meta.env.DEV) {
              // console.log('Timer stopped - Analytics logged, total time:', totalMinutes, 'minutes');
            }
          } catch (error) {
            console.error('Error logging timer stop:', error);
          }
        }
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
        
        // RESUME TIMER: Adjust session startTime to account for paused duration
        if (sessionRef.current && pauseStartTimeRef.current) {
          const pauseDuration = Math.floor((Date.now() - pauseStartTimeRef.current) / 1000);
          const originalStartTime = new Date(sessionRef.current.startTime);
          // Adjust startTime forward by pause duration to resume from where we paused
          const adjustedStartTime = new Date(originalStartTime.getTime() + (pauseDuration * 1000));
          
          // Update session with adjusted startTime
          setSession((prevSession) => {
            if (!prevSession) return prevSession;
            const updatedSession = {
              ...prevSession,
              startTime: adjustedStartTime.toISOString(),
              attendanceQuestions: [
                response.question,
                ...(prevSession.attendanceQuestions || []),
              ],
            };
            sessionRef.current = updatedSession;
            return updatedSession;
          });
          
          // Clear pause tracking
          pauseStartTimeRef.current = null;
        }

        setShowQuestion(false);
        setCurrentQuestion(null);
        setAnswer('');

        // Update session state with new question (if not already updated above)
        if (!pauseStartTimeRef.current) {
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
        }

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
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let lastCheck = Date.now();
  
    const interval = setInterval(async () => {
      const now = Date.now();
      const diff = now - lastCheck;
  
      // Detect sleep ONLY if tab is hidden + big time jump
      if (document.hidden && diff > 120000) { // 2 min
        // console.log("Sleep/lock detected");
  
        if (sessionRef.current?.status === "ACTIVE") {
          alert("System sleep detected. Timer paused automatically.");
          await handlePause();
        }
      }
  
      lastCheck = now;
    }, 5000);
  
    return () => clearInterval(interval);
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
              {(session.status === 'PAUSED' || showQuestion) && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  ⏸️ {showQuestion ? 'Timer Paused - Answer Question' : 'Paused'}
                </span>
              )}
              <div className={`text-2xl sm:text-3xl font-bold ${
                session.status === 'PAUSED' || showQuestion ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {formatTime(elapsedTime)}
              </div>
            </div>
            {nextQuestionTime !== null && nextQuestionTime > 0 && session.status === 'ACTIVE' && !showQuestion && (
              <div className="text-xs sm:text-sm text-gray-500 mt-1">
                Next check in {nextQuestionTime} min
              </div>
            )}
            {showQuestion && currentQuestion && (
              <div className="text-xs sm:text-sm text-red-600 mt-1 font-medium">
                ⚠️ Timer paused - Answer the question to resume
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
              Just verifying you're still here! 😊<br />
              <span className="text-yellow-600 font-medium">⏸️ Timer is paused - Answer to resume tracking</span>
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

