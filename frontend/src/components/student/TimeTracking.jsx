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
import {
  getTimerState,
  setTimerState,
  clearTimerState,
  getElapsedSeconds,
  TIMER_STORAGE_KEY,
} from '../../utils/timerStorage';
import { timerLog, timerLogApi, timerLogState } from '../../utils/timerLogger';

const TimeTracking = () => {
  const [session, setSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  /** 'start' | 'pause' | 'resume' | 'stop' | null - ensures we never get stuck on "Stopping..." / "Pausing..." */
  const [actionPending, setActionPending] = useState(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [nextQuestionTime, setNextQuestionTime] = useState(null);
  const [todayHours, setTodayHours] = useState(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);

  const intervalRef = useRef(null);
  const questionIntervalRef = useRef(null);
  const heartbeatRef = useRef(null);
  const timeUpdateRef = useRef(null);
  const sessionRefreshRef = useRef(null);
  const sessionRef = useRef(null);
  const questionTimeoutRef = useRef(null);
  const showQuestionRef = useRef(false);
  const currentQuestionRef = useRef(null);
  const pauseStartTimeRef = useRef(null);
  const pausedElapsedTimeRef = useRef(0);
  const autoStopInProgressRef = useRef(false);
  const lastTimeUpdateRef = useRef(Date.now());
  const lastHeartbeatRef = useRef(Date.now());
  const lastQuestionCheckRef = useRef(Date.now());
  const stopInProgressRef = useRef(false);
  const pauseInProgressRef = useRef(false);
  const tickIdRef = useRef(null);

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

  // Helper to clear session state locally and clear timer persistence
  const stopSessionLocally = () => {
    if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
    questionTimeoutRef.current = null;
    if (tickIdRef.current) clearTimeout(tickIdRef.current);
    tickIdRef.current = null;

    // Clear intervals and timeouts
    if (timeUpdateRef.current) clearTimeout(timeUpdateRef.current);
    if (questionIntervalRef.current) clearTimeout(questionIntervalRef.current);
    if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
    if (sessionRefreshRef.current) clearTimeout(sessionRefreshRef.current);

    clearTimerState();
    setSession(null);
    sessionRef.current = null;
    autoStopInProgressRef.current = false;
    setElapsedTime(0);
    setShowQuestion(false);
    showQuestionRef.current = false;
    setCurrentQuestion(null);
    currentQuestionRef.current = null;
    setNextQuestionTime(null);
    localStorage.removeItem('pendingAttendanceQuestion');

    lastTimeUpdateRef.current = Date.now();
    lastHeartbeatRef.current = Date.now();
    lastQuestionCheckRef.current = Date.now();

    loadTodayHours();
    timerLogState('session', 'cleared');
  };

  // Handle auto-stop session when question is not answered (2 min timeout)
  const handleAutoStopSession = async () => {
    if (autoStopInProgressRef.current) return;
    autoStopInProgressRef.current = true;

    try {
      // Show notification only once
      try {
        showBackgroundNotification(() => {
          window.focus();
        }).catch(err => console.error('Background notification failed:', err));
      } catch (error) {
        console.error('Error initiating notification:', error);
      }

      try {
        const response = await api.timeTracking.finish();
        if (response.success) {
          stopSessionLocally();
        }
      } catch (error) {
        console.error('Error auto-stopping session API:', error);
        stopSessionLocally();
      }
    } finally {
      autoStopInProgressRef.current = false;
    }
  };

  // Check for pending questions stored in localStorage (e.g. after tab was closed/refreshed)
  const checkForPendingQuestion = async () => {
    try {
      const pendingQuestion = localStorage.getItem('pendingAttendanceQuestion');
      if (!pendingQuestion) return;

      const questionData = JSON.parse(pendingQuestion);
      const questionTime = new Date(questionData.askedAt);
      const now = new Date();
      const elapsedMs = now - questionTime;
      const TIMEOUT_MS = 120000; // 2 minutes

      // If we already have this exact question showing, only refresh timeout once (don't re-set state every 30s)
      if (showQuestionRef.current && currentQuestionRef.current?.id === questionData.id) {
        // Already showing this question - do not re-set state or re-set timeout (avoids repeated triggers)
        return;
      }

      if (elapsedMs < TIMEOUT_MS) {
        // PAUSE TIMER: Store current elapsed time and pause start time
        if (sessionRef.current) {
          const startTime = new Date(sessionRef.current.startTime);
          const currentElapsed = Math.floor((now - startTime) / 1000);
          pausedElapsedTimeRef.current = currentElapsed;
          pauseStartTimeRef.current = questionTime;
        }

        setCurrentQuestion(questionData);
        setShowQuestion(true);
        setAnswer('');
        setQuestionError('');

        const remainingTime = TIMEOUT_MS - elapsedMs;
        if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
        questionTimeoutRef.current = setTimeout(handleAutoStopSession, remainingTime);

        if (!document.hidden) window.focus();
      } else {
        handleAutoStopSession();
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
      checkForPendingQuestion();
    });
    loadTodayHours();

    // Multi-tab sync: when another tab changes timer localStorage, re-sync with server
    const handleStorage = (e) => {
      if (e.key === TIMER_STORAGE_KEY) {
        timerLog('storage_event', { key: e.key });
        loadActiveSession();
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForPendingQuestion();
        if (sessionRef.current && sessionRef.current.status === 'ACTIVE') {
          startTimeTracking();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pendingCheckInterval = setInterval(() => {
      if (!document.hidden) checkForPendingQuestion();
    }, 60000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pendingCheckInterval);
      if (tickIdRef.current) clearTimeout(tickIdRef.current);
    };
  }, []);

  // Load active session and sync with localStorage (reconcile backend vs client)
  const loadActiveSession = async () => {
    try {
      const response = await api.timeTracking.getActive();
      timerLogApi('getActive', response.success ? response : new Error(response.message || 'no session'));

      if (response.success && response.session) {
        const s = response.session;
        const startTimeMs = new Date(s.startTime).getTime();
        const pausedMinutes = s.pausedMinutes || 0;
        const accumulatedPausedMs = pausedMinutes * 60 * 1000;
        const isPaused = s.status === 'PAUSED';
        setTimerState({
          startTime: startTimeMs,
          sessionId: String(s.id),
          status: isPaused ? 'paused' : 'running',
          pauseTime: isPaused && s.lastPausedAt ? new Date(s.lastPausedAt).getTime() : null,
          accumulatedPausedMs,
        });
        setSession(s);
        sessionRef.current = s;
        setElapsedTime(Math.max(0, getElapsedSeconds(getTimerState())));

        if (s.status === 'ACTIVE') {
          const now = new Date();
          const pendingQuestion = localStorage.getItem('pendingAttendanceQuestion');
          if (pendingQuestion) {
            try {
              const questionData = JSON.parse(pendingQuestion);
              const questionTime = new Date(questionData.askedAt);
              const elapsedMs = now - questionTime;
              const TIMEOUT_MS = 120000;
              if (elapsedMs < TIMEOUT_MS) {
                pausedElapsedTimeRef.current = Math.max(0, getElapsedSeconds(getTimerState()));
                pauseStartTimeRef.current = questionTime;
              }
            } catch (e) {
              console.error('Error parsing pending question:', e);
            }
          }
          const lastQuestionTime = s.attendanceQuestions?.length > 0
            ? new Date(s.attendanceQuestions[0].askedAt)
            : new Date(s.startTime);
          const minutesSinceLastQuestion = Math.floor((now - lastQuestionTime) / (1000 * 60));
          const minutesUntilNext = 10 - (minutesSinceLastQuestion % 10);
          setNextQuestionTime(minutesUntilNext);
          startTimeTracking();
        }
      } else {
        // Backend says no active session: reconcile with local state
        const local = getTimerState();
        if (local && (local.status === 'running' || local.status === 'paused')) {
          timerLog('reconcile', { reason: 'backend_no_session_local_has_session', localStatus: local.status });
          clearTimerState();
          setSession(null);
          sessionRef.current = null;
          setElapsedTime(0);
        }
      }
      loadTodayHours();
    } catch (error) {
      console.error('Error loading active session:', error);
      timerLogApi('getActive', error);
      // On network failure, if we have local state we can still show timer (client-resilient)
      const local = getTimerState();
      if (local && (local.status === 'running' || local.status === 'paused')) {
        setSession({ id: local.sessionId, startTime: new Date(local.startTime).toISOString(), status: local.status === 'paused' ? 'PAUSED' : 'ACTIVE' });
        sessionRef.current = { id: local.sessionId, startTime: new Date(local.startTime).toISOString(), status: local.status === 'paused' ? 'PAUSED' : 'ACTIVE' };
        setElapsedTime(getElapsedSeconds(local));
        if (local.status === 'running') startTimeTracking();
      }
    }
  };

  // Refresh session data from server periodically to keep it fresh
  const refreshSessionData = async () => {
    if (!sessionRef.current) return;
    
    try {
      const response = await api.timeTracking.getActive();
      if (response.success && response.session) {
        // Update session ref with fresh data (especially attendanceQuestions)
        sessionRef.current = response.session;
        setSession(response.session);
        
        // Update elapsed time from fresh data
        const startTime = new Date(response.session.startTime);
        const now = new Date();
        const pausedSeconds = (response.session.pausedMinutes || 0) * 60;
        const elapsed = Math.floor((now - startTime) / 1000) - pausedSeconds;
        if (!showQuestionRef.current) {
          setElapsedTime(Math.max(0, elapsed));
        }
      } else {
        // Session no longer exists on server - stop locally
        stopSessionLocally();
      }
    } catch (error) {
      console.error('Error refreshing session data:', error);
      // Don't stop session on error - might be temporary network issue
    }
  };

  // Start time tracking with improved reliability
  const startTimeTracking = () => {
    // Clear any existing intervals/timeouts
    if (timeUpdateRef.current) clearTimeout(timeUpdateRef.current);
    if (questionIntervalRef.current) clearTimeout(questionIntervalRef.current);
    if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
    if (sessionRefreshRef.current) clearTimeout(sessionRefreshRef.current);

    // Reset tracking refs
    lastTimeUpdateRef.current = Date.now();
    lastHeartbeatRef.current = Date.now();
    lastQuestionCheckRef.current = Date.now();

    // Heartbeat every 1 min using chained setTimeout (more reliable than setInterval)
    const scheduleHeartbeat = () => {
      if (sessionRef.current?.status === 'ACTIVE') {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
        
        // Recovery: if heartbeat hasn't fired in >2 minutes, send immediately
        if (timeSinceLastHeartbeat > 120000) {
          console.warn('Heartbeat recovery: interval was throttled, sending immediate heartbeat');
          api.timeTracking.heartbeat().catch((err) => console.error('Heartbeat failed:', err));
          lastHeartbeatRef.current = now;
        }
        
        // Schedule next heartbeat
        heartbeatRef.current = setTimeout(() => {
          if (sessionRef.current?.status === 'ACTIVE') {
            api.timeTracking.heartbeat()
              .then(() => {
                lastHeartbeatRef.current = Date.now();
                scheduleHeartbeat(); // Schedule next one
              })
              .catch((err) => {
                console.error('Heartbeat failed:', err);
                scheduleHeartbeat(); // Retry even on error
              });
          }
        }, 60000); // 1 minute
      }
    };
    
    // Send initial heartbeat
    if (sessionRef.current?.status === 'ACTIVE') {
      api.timeTracking.heartbeat().catch((err) => console.error('Heartbeat failed:', err));
      lastHeartbeatRef.current = Date.now();
    }
    scheduleHeartbeat();

    // Update elapsed from timestamps only (Date.now() - startTime - pausedDuration), no counter drift
    const scheduleTimeUpdate = () => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE') {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastTimeUpdateRef.current;
        if (timeSinceLastUpdate > 5000) {
          console.warn('Time update recovery: interval was throttled');
        }
        if (!showQuestionRef.current) {
          const state = getTimerState();
          setElapsedTime(state ? getElapsedSeconds(state) : 0);
        } else {
          setElapsedTime(pausedElapsedTimeRef.current);
        }
        lastTimeUpdateRef.current = now;
        timeUpdateRef.current = setTimeout(scheduleTimeUpdate, 1000);
      }
    };
    scheduleTimeUpdate();

    // Check for questions every minute using chained setTimeout
    const scheduleQuestionCheck = () => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE' && !showQuestionRef.current) {
        const now = Date.now();
        const timeSinceLastCheck = now - lastQuestionCheckRef.current;
        
        // Recovery: if check hasn't fired in >2 minutes, check immediately
        if (timeSinceLastCheck > 120000) {
          console.warn('Question check recovery: interval was throttled, checking immediately');
          checkForQuestion();
          lastQuestionCheckRef.current = now;
        }
        
        // Schedule next check
        questionIntervalRef.current = setTimeout(() => {
          if (sessionRef.current && sessionRef.current.status === 'ACTIVE' && !showQuestionRef.current) {
            checkForQuestion();
            lastQuestionCheckRef.current = Date.now();
            scheduleQuestionCheck(); // Schedule next one
          }
        }, 60000); // 1 minute
      }
    };
    
    // Initial check after delay
    setTimeout(() => {
      if (sessionRef.current && sessionRef.current.status === 'ACTIVE' && !showQuestionRef.current) {
        checkForQuestion();
        lastQuestionCheckRef.current = Date.now();
        scheduleQuestionCheck();
      }
    }, 5000);

    // Refresh session data from server every 5 minutes to keep it fresh
    const scheduleSessionRefresh = () => {
      if (sessionRef.current?.status === 'ACTIVE') {
        refreshSessionData();
        sessionRefreshRef.current = setTimeout(scheduleSessionRefresh, 5 * 60000); // 5 minutes
      }
    };
    scheduleSessionRefresh();
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
      setQuestionLoading(true);
      const response = await api.timeTracking.askQuestion();
      if (response.success) {
        const now = new Date();
        const questionData = {
          ...response.question,
          askedAt: now.toISOString(),
        };

        // Update session ref immediately so the next checkForQuestion (every 1 min) sees this question
        // and does not ask again for 10 minutes (avoids repeated questions/notifications)
        if (sessionRef.current) {
          const updatedSession = {
            ...sessionRef.current,
            attendanceQuestions: [
              { ...response.question, askedAt: questionData.askedAt },
              ...(sessionRef.current.attendanceQuestions || []),
            ],
          };
          sessionRef.current = updatedSession;
        }

        // PAUSE TIMER: Store current elapsed time and pause start time
        if (sessionRef.current) {
          const startTime = new Date(sessionRef.current.startTime);
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
      setQuestionLoading(false);
    }
  };

  // Handle start session
  const handleStart = async () => {
    timerLog('start_click');
    setActionPending('start');
    try {
      if ('serviceWorker' in navigator) {
        try {
          await registerServiceWorker();
        } catch (error) {
          console.error('Service Worker registration error:', error);
        }
      }
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        const userChoice = confirm('Notifications are required for attendance check reminders. Without notifications, you may miss important alerts. Do you want to continue without notifications?');
        if (!userChoice) {
          setActionPending(null);
          return;
        }
        console.warn('User declined notification permission');
      }

      const response = await api.timeTracking.start();
      timerLogApi('start', response.success ? response : new Error(response?.message));

      if (response.success && response.session) {
        const s = response.session;
        const startTimeMs = new Date(s.startTime).getTime();
        setTimerState({
          startTime: startTimeMs,
          sessionId: String(s.id),
          status: 'running',
          accumulatedPausedMs: 0,
        });
        setSession(s);
        sessionRef.current = s;
        setElapsedTime(0);
        setNextQuestionTime(10);
        startTimeTracking();
        timerLogState('idle', 'running', { sessionId: s.id });

        if (analytics) {
          try {
            const user = authService.getUser();
            logEvent(analytics, 'timer_start', {
              user_id: user ? `user_${user.id}` : 'anonymous',
              session_id: s.id,
              start_time: s.startTime,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error logging timer start:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error starting session:', error);
      timerLogApi('start', error);
      alert(error.message || 'Failed to start time tracking');
    } finally {
      setActionPending(null);
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

  // Handle pause session (race-safe: single pause at a time, always clear loading in finally)
  const handlePause = async () => {
    if (!session || session.status === 'PAUSED') return;
    if (pauseInProgressRef.current) return;
    const local = getTimerState();
    if (!local || local.status !== 'running' || !local.sessionId) {
      timerLog('pause_click', { skipped: 'no_valid_local_state', local: !!local });
      return;
    }

    pauseInProgressRef.current = true;
    const pauseTimeMs = Date.now();
    setTimerState({ ...local, status: 'paused', pauseTime: pauseTimeMs });
    setActionPending('pause');
    timerLog('pause_click', { sessionId: local.sessionId });

    try {
      const response = await api.timeTracking.pause();
      timerLogApi('pause', response.success ? response : new Error(response?.message));
      if (response.success) {
        setSession(response.session);
        sessionRef.current = response.session;
        if (timeUpdateRef.current) clearTimeout(timeUpdateRef.current);
        if (questionIntervalRef.current) clearTimeout(questionIntervalRef.current);
        if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
        if (sessionRefreshRef.current) clearTimeout(sessionRefreshRef.current);
        timerLogState('running', 'paused', { sessionId: response.session.id });

        if (analytics) {
          try {
            const user = authService.getUser();
            const elapsedSeconds = getElapsedSeconds(getTimerState());
            logEvent(analytics, 'timer_pause', {
              user_id: user ? `user_${user.id}` : 'anonymous',
              session_id: response.session.id,
              elapsed_time_seconds: elapsedSeconds,
              elapsed_time_minutes: Math.round((elapsedSeconds / 60) * 100) / 100,
              pause_time: new Date().toISOString(),
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error logging timer pause:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error pausing session:', error);
      timerLogApi('pause', error);
      alert(error.message || 'Failed to pause time tracking');
      setTimerState({ ...getTimerState(), status: 'running', pauseTime: null });
    } finally {
      setActionPending(null);
      pauseInProgressRef.current = false;
    }
  };

  // Handle resume session (always clear loading in finally)
  const handleResume = async () => {
    if (!session || session.status !== 'PAUSED') return;
    const local = getTimerState();
    if (!local || local.status !== 'paused' || local.pauseTime == null) return;

    const now = Date.now();
    const additionalPausedMs = now - local.pauseTime;
    setTimerState({
      ...local,
      status: 'running',
      pauseTime: null,
      accumulatedPausedMs: (local.accumulatedPausedMs || 0) + additionalPausedMs,
    });
    setActionPending('resume');
    timerLog('resume_click', { sessionId: local.sessionId });

    try {
      const response = await api.timeTracking.resume();
      timerLogApi('resume', response.success ? response : new Error(response?.message));
      if (response.success) {
        setSession(response.session);
        sessionRef.current = response.session;
        startTimeTracking();
        timerLogState('paused', 'running', { sessionId: response.session.id });

        if (analytics) {
          try {
            const user = authService.getUser();
            const elapsedSeconds = getElapsedSeconds(getTimerState());
            logEvent(analytics, 'timer_resume', {
              user_id: user ? `user_${user.id}` : 'anonymous',
              session_id: response.session.id,
              elapsed_time_seconds: elapsedSeconds,
              elapsed_time_minutes: Math.round((elapsedSeconds / 60) * 100) / 100,
              resume_time: new Date().toISOString(),
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error logging timer resume:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      timerLogApi('resume', error);
      alert(error.message || 'Failed to resume time tracking');
      setTimerState({ ...getTimerState(), status: 'paused', pauseTime: now });
    } finally {
      setActionPending(null);
    }
  };

  // Handle stop session (race-safe: single stop at a time, reconcile "No active session")
  const handleStop = async () => {
    if (showQuestion && currentQuestion) {
      alert('Please answer the current question before stopping the session.');
      return;
    }
    if (!window.confirm('Are you sure you want to stop the time tracking session? This will save today\'s working hours.')) {
      return;
    }

    const local = getTimerState();
    const hasValidLocal = local && local.sessionId && (local.status === 'running' || local.status === 'paused');
    if (!hasValidLocal && !session) {
      timerLog('stop_click', { skipped: 'no_session_no_local' });
      return;
    }
    if (stopInProgressRef.current) return;

    stopInProgressRef.current = true;
    setActionPending('stop');
    timerLog('stop_click', { sessionId: local?.sessionId || session?.id });

    try {
      const response = await api.timeTracking.finish();
      timerLogApi('finish', response.success ? response : new Error(response?.message));

      if (response.success) {
        stopSessionLocally();
        const totalMinutes = response.session.totalMinutes || 0;
        const totalSeconds = totalMinutes * 60;
        alert(`Session stopped! Total time: ${formatTimeReadable(totalSeconds)}`);
        timerLogState('session', 'stopped', { sessionId: response.session.id });

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
          } catch (error) {
            console.error('Error logging timer stop:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error stopping session:', error);
      timerLogApi('finish', error);
      const isNoSession = error?.message?.toLowerCase().includes('no active') ||
        error?.status === 404;
      if (isNoSession) {
        timerLog('reconcile', { reason: 'stop_failed_no_active_session' });
        stopSessionLocally();
        alert('Session was already ended. Timer has been reset.');
      } else {
        alert(error.message || 'Failed to stop time tracking');
      }
    } finally {
      setActionPending(null);
      stopInProgressRef.current = false;
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
      setQuestionLoading(true);
      setQuestionError('');
      const response = await api.timeTracking.answerQuestion(currentQuestion.id, answer.trim());

      if (response.success) {
        const isCorrect = response.question.isCorrect;
        
        // RESUME TIMER: Add question-pause duration to localStorage so elapsed stays correct
        if (sessionRef.current && pauseStartTimeRef.current) {
          const pauseDurationMs = Date.now() - pauseStartTimeRef.current;
          const local = getTimerState();
          if (local) {
            setTimerState({
              ...local,
              accumulatedPausedMs: (local.accumulatedPausedMs || 0) + pauseDurationMs,
            });
          }
          const pauseDuration = Math.floor(pauseDurationMs / 1000);
          const originalStartTime = new Date(sessionRef.current.startTime);
          const adjustedStartTime = new Date(originalStartTime.getTime() + pauseDurationMs);

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
      setQuestionLoading(false);
    }
  };

  // Cleanup on unmount (prevent duplicate intervals and leaks)
  useEffect(() => {
    return () => {
      if (timeUpdateRef.current) clearTimeout(timeUpdateRef.current);
      if (questionIntervalRef.current) clearTimeout(questionIntervalRef.current);
      if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
      if (sessionRefreshRef.current) clearTimeout(sessionRefreshRef.current);
      if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
      if (tickIdRef.current) clearTimeout(tickIdRef.current);
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
            disabled={actionPending !== null}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            {actionPending === 'start' ? 'Starting...' : 'Start'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            {session.status === 'PAUSED' ? (
              <button
                onClick={handleResume}
                disabled={actionPending !== null}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                {actionPending === 'resume' ? 'Resuming...' : 'Resume'}
              </button>
            ) : (
              <button
                onClick={handlePause}
                disabled={actionPending !== null}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Pause className="w-4 h-4 mr-2" />
                {actionPending === 'pause' ? 'Pausing...' : 'Pause'}
              </button>
            )}
            <button
              onClick={handleStop}
              disabled={actionPending !== null}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Square className="w-4 h-4 mr-2" />
              {actionPending === 'stop' ? 'Stopping...' : 'Stop'}
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
                  disabled={questionLoading || !answer.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {questionLoading ? 'Submitting...' : 'Submit'}
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

