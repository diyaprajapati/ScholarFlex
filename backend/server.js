const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const logRoutes = require('./routes/logRoutes');
const internRoutes = require('./routes/internRoutes');
const questionPaperRoutes = require('./routes/questionPaperRoutes');
const studentTestRoutes = require('./routes/studentTestRoutes');
const domainRoutes = require('./routes/domainRoutes');
const testAttemptRoutes = require('./routes/testAttemptRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const activityRoutes = require('./routes/activityRoutes');
const nocRoutes = require('./routes/nocRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const videoTrackingRoutes = require('./routes/videoTrackingRoutes');
const videoAnalyticsRoutes = require('./routes/videoAnalyticsRoutes');
const errorHandler = require('./middleware/errorHandler');
const pool = require('./config/database');
const { prisma } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - THIS MUST BE FIRST
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    // or any origin in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 CORS: Allowing request from origin: ${origin || 'no origin'}`);
    }
    callback(null, true); // Allow all origins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware (for debugging)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    console.log(`📨 ${req.method} ${req.path} from ${req.get('origin') || 'no origin'}`);
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ScholarFlex API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/question-papers', questionPaperRoutes);
app.use('/api/student', studentTestRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/test-attempts', testAttemptRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api', nocRoutes);
app.use('/api/video-tracking', videoTrackingRoutes);
app.use('/api/video-tracking', require('./routes/enhancedVideoTrackingRoutes'));
app.use('/api/video-analytics', videoAnalyticsRoutes);
app.use('/api/video-analytics', require('./routes/enhancedVideoAnalyticsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🌍 Server accessible on: http://0.0.0.0:${PORT} and http://localhost:${PORT}`);
});

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  console.log(`${signal} signal received: closing HTTP server`);
  
  try {
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected');
    
    await pool.end();
    console.log('✅ Database pool closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNCAUGHT_EXCEPTION').then(() => {
      process.exit(1);
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION').then(() => {
      process.exit(1);
    });
  }
});

module.exports = app;