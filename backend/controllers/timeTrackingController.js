const { validationResult } = require('express-validator');
const { prisma } = require('../config/database');

// Predefined random questions for attendance verification
// Mix of conversational and simple questions to verify user presence
const ATTENDANCE_QUESTIONS = [
  // Conversational questions
  { question: 'Hey! How are you doing?', answer: 'good', alternatives: ['fine', 'well', 'great', 'ok', 'okay', 'doing well'] },
  { question: 'Are you still there?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'here'] },
  { question: 'Can you confirm you are present?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'present', 'here'] },
  { question: 'Just checking - are you active?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'active', 'here'] },
  { question: 'Quick check - are you working?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'working', 'coding'] },
  { question: 'Hey! Still coding?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'coding', 'working'] },
  { question: 'Are you at your laptop?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'here', 'present'] },
  { question: 'Quick question - are you here?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'here', 'present'] },
  
  // Simple math (easy to answer quickly)
  { question: 'What is 2 + 2?', answer: '4' },
  { question: 'What is 5 + 3?', answer: '8' },
  { question: 'What is 10 - 5?', answer: '5' },
  { question: 'What is 3 × 2?', answer: '6' },
  { question: 'What is 8 ÷ 2?', answer: '4' },
  
  // Simple general knowledge
  { question: 'What color is the sky?', answer: 'blue' },
  { question: 'How many days in a week?', answer: '7' },
  { question: 'What is the first letter of alphabet?', answer: 'a' },
  { question: 'What comes after Monday?', answer: 'tuesday', alternatives: ['tue', 'tues'] },
  { question: 'What is 1 + 1?', answer: '2' },
  
  // Tech-related (for coding context)
  { question: 'Are you coding right now?', answer: 'yes', alternatives: ['yeah', 'yep', 'yup', 'sure', 'coding', 'working'] },
  { question: 'What language are you using? (just say "coding")', answer: 'coding', alternatives: ['programming', 'working'] },
];

/**
 * Start a time tracking session
 * POST /api/student/time-tracking/start
 */
const startTimeTracking = async (req, res) => {
  try {
    // Get student ID from authenticated user
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Check if there's an active session
    const activeSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active time tracking session',
        session: activeSession,
      });
    }

    // Create new session (set lastHeartbeatAt so cron doesn't auto-finish immediately)
    const session = await prisma.timeTrackingSession.create({
      data: {
        studentId: student.id,
        startTime: new Date(),
        status: 'ACTIVE',
        lastHeartbeatAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Time tracking session started',
      session,
    });
  } catch (error) {
    console.error('Error starting time tracking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Finish a time tracking session
 * POST /api/student/time-tracking/finish
 */
const finishTimeTracking = async (req, res) => {
  try {
    // Get student ID from authenticated user
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Find active or paused session
    const activeSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        OR: [
          { status: 'ACTIVE' },
          { status: 'PAUSED' },
        ],
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active time tracking session found',
      });
    }

    // Calculate total minutes (excluding paused time)
    const finishTime = new Date();
    const startTime = new Date(activeSession.startTime);
    let totalMinutes = Math.floor((finishTime - startTime) / (1000 * 60));
    
    // Subtract paused minutes
    totalMinutes = Math.max(0, totalMinutes - (activeSession.pausedMinutes || 0));
    
    // If session was paused, add the time since last pause
    if (activeSession.status === 'PAUSED' && activeSession.lastPausedAt) {
      const pausedAt = new Date(activeSession.lastPausedAt);
      const pausedDuration = Math.floor((finishTime - pausedAt) / (1000 * 60));
      totalMinutes = Math.max(0, totalMinutes - pausedDuration);
    }

    // Update session
    const updatedSession = await prisma.timeTrackingSession.update({
      where: { id: activeSession.id },
      data: {
        finishTime,
        totalMinutes,
        status: 'COMPLETED',
      },
      include: {
        attendanceQuestions: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Time tracking session finished',
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error finishing time tracking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Heartbeat - update lastHeartbeatAt for active session (frontend calls every 1 min).
 * Used by cron to auto-finish sessions when client is gone (shutdown, closed tab).
 * POST /api/student/time-tracking/heartbeat
 */
const heartbeat = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const activeSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
      },
      orderBy: { startTime: 'desc' },
    });

    if (!activeSession) {
      return res.status(200).json({ success: true, message: 'No active session' });
    }

    await prisma.timeTrackingSession.update({
      where: { id: activeSession.id },
      data: { lastHeartbeatAt: new Date() },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get current active session
 * GET /api/student/time-tracking/active
 */
const getActiveSession = async (req, res) => {
  try {
    // Get student ID from authenticated user
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Find active or paused session
    const activeSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        OR: [
          { status: 'ACTIVE' },
          { status: 'PAUSED' },
        ],
      },
      orderBy: {
        startTime: 'desc',
      },
      include: {
        attendanceQuestions: {
          orderBy: {
            askedAt: 'desc',
          },
        },
      },
    });

    if (!activeSession) {
      return res.status(200).json({
        success: true,
        session: null,
      });
    }

    res.status(200).json({
      success: true,
      session: activeSession,
    });
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Ask a random attendance question
 * POST /api/student/time-tracking/ask-question
 */
const askAttendanceQuestion = async (req, res) => {
  try {
    // Get student ID from authenticated user
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Find active session
    const activeSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active time tracking session found',
      });
    }

    // Get random question
    const randomIndex = Math.floor(Math.random() * ATTENDANCE_QUESTIONS.length);
    const selectedQuestion = ATTENDANCE_QUESTIONS[randomIndex];

    // Create attendance question record
    const attendanceQuestion = await prisma.attendanceQuestion.create({
      data: {
        sessionId: activeSession.id,
        questionText: selectedQuestion.question,
        correctAnswer: selectedQuestion.answer,
        askedAt: new Date(),
      },
    });

    // Return question without answer
    res.status(200).json({
      success: true,
      question: {
        id: attendanceQuestion.id,
        questionText: attendanceQuestion.questionText,
      },
    });
  } catch (error) {
    console.error('Error asking attendance question:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Answer an attendance question
 * POST /api/student/time-tracking/answer-question
 */
const answerAttendanceQuestion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { questionId, answer } = req.body;

    // Get student ID from authenticated user
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    // Find the question
    const attendanceQuestion = await prisma.attendanceQuestion.findUnique({
      where: { id: questionId },
      include: {
        timeTrackingSession: true,
      },
    });

    if (!attendanceQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Check if question belongs to student's active session
    if (attendanceQuestion.timeTrackingSession.studentId !== student.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to question',
      });
    }

    // Check if already answered
    if (attendanceQuestion.studentAnswer !== null) {
      return res.status(400).json({
        success: false,
        message: 'Question already answered',
      });
    }

    // Get the question data to check alternatives
    // We need to find the original question to get alternatives
    const questionData = ATTENDANCE_QUESTIONS.find(
      q => q.question === attendanceQuestion.questionText
    );
    
    // Check answer (case-insensitive, trim whitespace)
    const userAnswer = answer.toLowerCase().trim();
    const correctAnswer = attendanceQuestion.correctAnswer.toLowerCase().trim();
    
    // Check if answer matches or is in alternatives
    let isCorrect = userAnswer === correctAnswer;
    
    // If there are alternatives, check those too
    if (!isCorrect && questionData && questionData.alternatives) {
      isCorrect = questionData.alternatives.some(
        alt => alt.toLowerCase().trim() === userAnswer
      );
    }

    // Update question
    const updatedQuestion = await prisma.attendanceQuestion.update({
      where: { id: questionId },
      data: {
        studentAnswer: answer,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Answer submitted',
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('Error answering attendance question:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Pause a time tracking session
 * POST /api/student/time-tracking/pause
 */
const pauseTimeTracking = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const activeSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        message: 'No active time tracking session found',
      });
    }

    const updatedSession = await prisma.timeTrackingSession.update({
      where: { id: activeSession.id },
      data: {
        status: 'PAUSED',
        lastPausedAt: new Date(),
        pauseCount: {
          increment: 1,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Time tracking session paused',
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error pausing time tracking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Resume a paused time tracking session
 * POST /api/student/time-tracking/resume
 */
const resumeTimeTracking = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const pausedSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        status: 'PAUSED',
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (!pausedSession) {
      return res.status(404).json({
        success: false,
        message: 'No paused time tracking session found',
      });
    }

    const now = new Date();
    const lastPausedAt = new Date(pausedSession.lastPausedAt);
    const pausedDuration = Math.floor((now - lastPausedAt) / (1000 * 60));
    const newPausedMinutes = (pausedSession.pausedMinutes || 0) + pausedDuration;

    const updatedSession = await prisma.timeTrackingSession.update({
      where: { id: pausedSession.id },
      data: {
        status: 'ACTIVE',
        pausedMinutes: newPausedMinutes,
        lastPausedAt: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Time tracking session resumed',
      session: updatedSession,
    });
  } catch (error) {
    console.error('Error resuming time tracking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get today's working hours for student
 * GET /api/student/time-tracking/today
 */
const getTodayWorkingHours = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { email: req.user.email },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todaySessions = await prisma.timeTrackingSession.findMany({
      where: {
        studentId: student.id,
        status: 'COMPLETED',
        finishTime: {
          gte: today,
          lte: todayEnd,
        },
      },
    });

    // Calculate total minutes from completed sessions
    let totalMinutes = todaySessions.reduce((sum, session) => {
      return sum + (session.totalMinutes || 0);
    }, 0);

    // Get active or paused session started today
    const activeSession = await prisma.timeTrackingSession.findFirst({
      where: {
        studentId: student.id,
        OR: [
          { status: 'ACTIVE' },
          { status: 'PAUSED' },
        ],
        startTime: {
          gte: today,
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // If there's an active session, calculate its elapsed time and add to total
    if (activeSession) {
      const now = new Date();
      const startTime = new Date(activeSession.startTime);
      
      // Calculate total elapsed minutes
      let elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
      
      // Subtract paused time if session is paused
      if (activeSession.status === 'PAUSED' && activeSession.lastPausedAt) {
        const pausedAt = new Date(activeSession.lastPausedAt);
        const pausedDuration = Math.floor((now - pausedAt) / (1000 * 60));
        elapsedMinutes -= pausedDuration;
      }
      
      // Add previously paused minutes
      if (activeSession.pausedMinutes) {
        elapsedMinutes -= activeSession.pausedMinutes;
      }
      
      // Add elapsed time from active session to total
      totalMinutes += Math.max(0, elapsedMinutes);
    }

    res.status(200).json({
      success: true,
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(2),
      sessionsCount: todaySessions.length,
      activeSession: activeSession || null,
    });
  } catch (error) {
    console.error('Error getting today working hours:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Helper function to calculate elapsed minutes from an active/paused session
 */
const calculateActiveSessionMinutes = (session) => {
  if (!session) return 0;
  
  const now = new Date();
  const startTime = new Date(session.startTime);
  
  // Calculate total elapsed minutes
  let elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
  
  // Subtract paused time if session is paused
  if (session.status === 'PAUSED' && session.lastPausedAt) {
    const pausedAt = new Date(session.lastPausedAt);
    const pausedDuration = Math.floor((now - pausedAt) / (1000 * 60));
    elapsedMinutes -= pausedDuration;
  }
  
  // Add previously paused minutes
  if (session.pausedMinutes) {
    elapsedMinutes -= session.pausedMinutes;
  }
  
  return Math.max(0, elapsedMinutes);
};

/**
 * Get all students' working hours for admin
 * GET /api/admin/time-tracking/students
 */
const getAllStudentsWorkingHours = async (req, res) => {
  try {
    const { date, studentId } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const dateEnd = new Date(targetDate);
    dateEnd.setHours(23, 59, 59, 999);

    const whereClause = {
      status: 'COMPLETED',
      finishTime: {
        gte: targetDate,
        lte: dateEnd,
      },
    };

    if (studentId) {
      whereClause.studentId = parseInt(studentId);
    }

    const sessions = await prisma.timeTrackingSession.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        finishTime: 'desc',
      },
    });

    // Get active/paused sessions for today
    const activeWhereClause = {
      OR: [
        { status: 'ACTIVE' },
        { status: 'PAUSED' },
      ],
      startTime: {
        gte: targetDate,
        lte: dateEnd,
      },
    };

    if (studentId) {
      activeWhereClause.studentId = parseInt(studentId);
    }

    const activeSessions = await prisma.timeTrackingSession.findMany({
      where: activeWhereClause,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    const studentHours = {};
    
    // Process completed sessions
    sessions.forEach((session) => {
      const sid = session.studentId;
      if (!studentHours[sid]) {
        studentHours[sid] = {
          student: session.student,
          totalMinutes: 0,
          sessionsCount: 0,
          sessions: [],
        };
      }
      studentHours[sid].totalMinutes += session.totalMinutes || 0;
      studentHours[sid].sessionsCount += 1;
      studentHours[sid].sessions.push({
        id: session.id,
        startTime: session.startTime,
        finishTime: session.finishTime,
        totalMinutes: session.totalMinutes,
      });
    });

    // Add active/paused sessions
    activeSessions.forEach((session) => {
      const sid = session.studentId;
      if (!studentHours[sid]) {
        studentHours[sid] = {
          student: session.student,
          totalMinutes: 0,
          sessionsCount: 0,
          sessions: [],
        };
      }
      const activeMinutes = calculateActiveSessionMinutes(session);
      studentHours[sid].totalMinutes += activeMinutes;
    });

    const DAILY_TARGET_HOURS = 7;
    const DAILY_TARGET_MINUTES = DAILY_TARGET_HOURS * 60;

    const result = Object.values(studentHours).map((data) => {
      const totalHours = parseFloat((data.totalMinutes / 60).toFixed(2));
      const targetProgress = Math.min((data.totalMinutes / DAILY_TARGET_MINUTES) * 100, 100);
      const metTarget = data.totalMinutes >= DAILY_TARGET_MINUTES;
      
      return {
        student: data.student,
        totalMinutes: data.totalMinutes,
        totalHours: totalHours.toFixed(2),
        sessionsCount: data.sessionsCount,
        sessions: data.sessions,
        dailyTargetHours: DAILY_TARGET_HOURS,
        targetProgress: targetProgress.toFixed(1),
        metTarget: metTarget,
        remainingMinutes: Math.max(0, DAILY_TARGET_MINUTES - data.totalMinutes),
      };
    });

    res.status(200).json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      students: result,
    });
  } catch (error) {
    console.error('Error getting students working hours:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get day-wise time tracking for all students (for admin analytics)
 * GET /api/admin/time-tracking/students/day-wise
 */
const getDayWiseStudentsWorkingHours = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;
    
    // Default to last 30 days if no date range specified
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);

    const whereClause = {
      status: 'COMPLETED',
      finishTime: {
        gte: start,
        lte: end,
      },
    };

    if (studentId) {
      whereClause.studentId = parseInt(studentId);
    }

    const sessions = await prisma.timeTrackingSession.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        finishTime: 'desc',
      },
    });

    // Get active/paused sessions in the date range
    const activeWhereClause = {
      OR: [
        { status: 'ACTIVE' },
        { status: 'PAUSED' },
      ],
      startTime: {
        gte: start,
        lte: end,
      },
    };

    if (studentId) {
      activeWhereClause.studentId = parseInt(studentId);
    }

    const activeSessions = await prisma.timeTrackingSession.findMany({
      where: activeWhereClause,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    // Group by student and then by day
    const studentDayWiseData = {};
    
    // Process completed sessions
    sessions.forEach((session) => {
      const sid = session.studentId;
      const finishDate = new Date(session.finishTime);
      const dateKey = finishDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!studentDayWiseData[sid]) {
        studentDayWiseData[sid] = {
          student: session.student,
          dailyData: {},
          totalMinutes: 0,
          totalDays: 0,
        };
      }
      
      if (!studentDayWiseData[sid].dailyData[dateKey]) {
        studentDayWiseData[sid].dailyData[dateKey] = {
          date: dateKey,
          totalMinutes: 0,
          sessionsCount: 0,
          sessions: [],
        };
        studentDayWiseData[sid].totalDays += 1;
      }
      
      studentDayWiseData[sid].dailyData[dateKey].totalMinutes += session.totalMinutes || 0;
      studentDayWiseData[sid].dailyData[dateKey].sessionsCount += 1;
      studentDayWiseData[sid].dailyData[dateKey].sessions.push({
        id: session.id,
        startTime: session.startTime,
        finishTime: session.finishTime,
        totalMinutes: session.totalMinutes,
      });
      
      studentDayWiseData[sid].totalMinutes += session.totalMinutes || 0;
    });

    // Process active/paused sessions
    activeSessions.forEach((session) => {
      const sid = session.studentId;
      const startDate = new Date(session.startTime);
      const dateKey = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Only include if the session started within the date range
      if (startDate >= start && startDate <= end) {
        if (!studentDayWiseData[sid]) {
          studentDayWiseData[sid] = {
            student: session.student,
            dailyData: {},
            totalMinutes: 0,
            totalDays: 0,
          };
        }
        
        if (!studentDayWiseData[sid].dailyData[dateKey]) {
          studentDayWiseData[sid].dailyData[dateKey] = {
            date: dateKey,
            totalMinutes: 0,
            sessionsCount: 0,
            sessions: [],
          };
          studentDayWiseData[sid].totalDays += 1;
        }
        
        const activeMinutes = calculateActiveSessionMinutes(session);
        studentDayWiseData[sid].dailyData[dateKey].totalMinutes += activeMinutes;
        studentDayWiseData[sid].totalMinutes += activeMinutes;
      }
    });

    const DAILY_TARGET_HOURS = 7;
    const DAILY_TARGET_MINUTES = DAILY_TARGET_HOURS * 60;

    // Convert to array format
    const result = Object.values(studentDayWiseData).map((data) => {
      const dailyArray = Object.values(data.dailyData)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((day) => {
          const dayHours = parseFloat((day.totalMinutes / 60).toFixed(2));
          const targetProgress = Math.min((day.totalMinutes / DAILY_TARGET_MINUTES) * 100, 100);
          const metTarget = day.totalMinutes >= DAILY_TARGET_MINUTES;
          
          return {
            ...day,
            totalHours: dayHours.toFixed(2),
            seconds: day.totalMinutes * 60, // For consistency with video analytics format
            dailyTargetHours: DAILY_TARGET_HOURS,
            targetProgress: targetProgress.toFixed(1),
            metTarget: metTarget,
            remainingMinutes: Math.max(0, DAILY_TARGET_MINUTES - day.totalMinutes),
          };
        });
      
      const totalHours = parseFloat((data.totalMinutes / 60).toFixed(2));
      const avgDailyMinutes = data.totalDays > 0 ? data.totalMinutes / data.totalDays : 0;
      const avgTargetProgress = Math.min((avgDailyMinutes / DAILY_TARGET_MINUTES) * 100, 100);
      const daysMetTarget = dailyArray.filter(day => day.metTarget).length;
      
      return {
        studentId: data.student.id,
        student: data.student,
        totalMinutes: data.totalMinutes,
        totalHours: totalHours.toFixed(2),
        totalDays: data.totalDays,
        dailyData: dailyArray,
        dailyTargetHours: DAILY_TARGET_HOURS,
        daysMetTarget: daysMetTarget,
        avgTargetProgress: avgTargetProgress.toFixed(1),
      };
    });

    res.status(200).json({
      success: true,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      students: result,
    });
  } catch (error) {
    console.error('Error getting day-wise students working hours:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get timer logs for all students (Admin only)
 * GET /api/admin/time-tracking/logs
 */
const getTimerLogs = async (req, res) => {
  try {
    const { studentId, startDate, endDate, status, page = 1, limit = 50 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause = {};
    
    if (studentId) {
      whereClause.studentId = parseInt(studentId);
    }
    
    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        whereClause.startTime.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.startTime.lte = end;
      }
    } else {
      // Default to last 30 days if no date range
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      whereClause.startTime = {
        gte: start,
        lte: end
      };
    }
    
    if (status) {
      whereClause.status = status;
    }

    // Get total count
    const total = await prisma.timeTrackingSession.count({
      where: whereClause
    });

    // Get sessions with student info
    const sessions = await prisma.timeTrackingSession.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullName: true,
            domain: {
              select: {
                domainName: true
              }
            }
          }
        },
        attendanceQuestions: {
          orderBy: {
            askedAt: 'asc'
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      skip,
      take: limitNum
    });

    // Transform sessions into event logs
    const logs = sessions.map(session => {
      const events = [];
      
      // START event
      events.push({
        type: 'START',
        timestamp: session.startTime,
        sessionId: session.id,
        studentId: session.studentId,
        studentName: session.student.fullName,
        studentEmail: session.student.email,
        domainName: session.student.domain?.domainName || null
      });

      // Track pause/resume cycles
      if (session.pauseCount > 0) {
        // Show pause event if currently paused or if there's a lastPausedAt
        if (session.status === 'PAUSED' && session.lastPausedAt) {
          events.push({
            type: 'PAUSE',
            timestamp: session.lastPausedAt,
            sessionId: session.id,
            studentId: session.studentId,
            studentName: session.student.fullName,
            studentEmail: session.student.email,
            domainName: session.student.domain?.domainName || null,
            pauseCount: session.pauseCount,
            note: `Pause #${session.pauseCount}`
          });
        }
        
        // If currently ACTIVE but has pause history, show resume event
        if (session.status === 'ACTIVE' && session.lastPausedAt && session.updatedAt > session.lastPausedAt) {
          events.push({
            type: 'RESUME',
            timestamp: session.updatedAt,
            sessionId: session.id,
            studentId: session.studentId,
            studentName: session.student.fullName,
            studentEmail: session.student.email,
            domainName: session.student.domain?.domainName || null,
            note: `Resumed after ${session.pauseCount} pause(s)`
          });
        }
        
        // If status is PAUSED but no lastPausedAt (edge case)
        if (session.status === 'PAUSED' && !session.lastPausedAt) {
          events.push({
            type: 'PAUSE',
            timestamp: session.updatedAt,
            sessionId: session.id,
            studentId: session.studentId,
            studentName: session.student.fullName,
            studentEmail: session.student.email,
            domainName: session.student.domain?.domainName || null,
            pauseCount: session.pauseCount
          });
        }
      }

      // STOP event (if session is completed)
      if (session.status === 'COMPLETED' && session.finishTime) {
        events.push({
          type: 'STOP',
          timestamp: session.finishTime,
          sessionId: session.id,
          studentId: session.studentId,
          studentName: session.student.fullName,
          studentEmail: session.student.email,
          domainName: session.student.domain?.domainName || null,
          totalMinutes: session.totalMinutes,
          pausedMinutes: session.pausedMinutes,
          pauseCount: session.pauseCount
        });
      }

      // Current status indicator if session is still active/paused
      if (session.status === 'ACTIVE' && session.pauseCount === 0) {
        events.push({
          type: 'ACTIVE',
          timestamp: session.updatedAt,
          sessionId: session.id,
          studentId: session.studentId,
          studentName: session.student.fullName,
          studentEmail: session.student.email,
          domainName: session.student.domain?.domainName || null,
          isActive: true
        });
      } else if (session.status === 'PAUSED' && !session.lastPausedAt) {
        events.push({
          type: 'PAUSED',
          timestamp: session.updatedAt,
          sessionId: session.id,
          studentId: session.studentId,
          studentName: session.student.fullName,
          studentEmail: session.student.email,
          domainName: session.student.domain?.domainName || null,
          isPaused: true
        });
      }

      return {
        sessionId: session.id,
        studentId: session.studentId,
        studentName: session.student.fullName,
        studentEmail: session.student.email,
        domainName: session.student.domain?.domainName || null,
        startTime: session.startTime,
        finishTime: session.finishTime,
        status: session.status,
        totalMinutes: session.totalMinutes,
        pausedMinutes: session.pausedMinutes,
        pauseCount: session.pauseCount,
        lastPausedAt: session.lastPausedAt,
        events: events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      };
    });

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting timer logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/** Stale threshold: no heartbeat for this many ms → auto-finish (e.g. 5 min) */
const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

/**
 * Internal: finish a session by record (compute totalMinutes, set COMPLETED).
 * Used by finishTimeTracking and by autoFinishStaleSessions.
 */
const finishSessionRecord = async (activeSession) => {
  const finishTime = new Date();
  const startTime = new Date(activeSession.startTime);
  let totalMinutes = Math.floor((finishTime - startTime) / (1000 * 60));
  totalMinutes = Math.max(0, totalMinutes - (activeSession.pausedMinutes || 0));
  if (activeSession.status === 'PAUSED' && activeSession.lastPausedAt) {
    const pausedAt = new Date(activeSession.lastPausedAt);
    const pausedDuration = Math.floor((finishTime - pausedAt) / (1000 * 60));
    totalMinutes = Math.max(0, totalMinutes - pausedDuration);
  }
  await prisma.timeTrackingSession.update({
    where: { id: activeSession.id },
    data: { finishTime, totalMinutes, status: 'COMPLETED' },
  });
};

/**
 * Auto-finish ACTIVE sessions that have not received a heartbeat for HEARTBEAT_STALE_MS.
 * Call this from a cron/setInterval every 5 minutes.
 */
const autoFinishStaleSessions = async () => {
  try {
    const cutoff = new Date(Date.now() - HEARTBEAT_STALE_MS);
    const staleSessions = await prisma.timeTrackingSession.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { lastHeartbeatAt: null },
          { lastHeartbeatAt: { lt: cutoff } },
        ],
      },
    });
    for (const session of staleSessions) {
      try {
        await finishSessionRecord(session);
        if (process.env.NODE_ENV === 'development') {
          // console.log(`[TimeTracking] Auto-finished stale session ${session.id} (studentId: ${session.studentId})`);
        }
      } catch (err) {
        console.error(`[TimeTracking] Error auto-finishing session ${session.id}:`, err);
      }
    }
  } catch (error) {
    console.error('[TimeTracking] Error in autoFinishStaleSessions:', error);
  }
};

module.exports = {
  startTimeTracking,
  finishTimeTracking,
  pauseTimeTracking,
  resumeTimeTracking,
  heartbeat,
  getActiveSession,
  askAttendanceQuestion,
  answerAttendanceQuestion,
  getTodayWorkingHours,
  getAllStudentsWorkingHours,
  getDayWiseStudentsWorkingHours,
  getTimerLogs,
  autoFinishStaleSessions,
};

