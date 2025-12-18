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
const errorHandler = require('./middleware/errorHandler');
const pool = require('./config/database');
const { prisma } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000; // Changed from 5000 to avoid AirPlay conflict

// Middleware - CORS configuration to allow all origins
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman) or any origin
    // This allows requests from any IP address, localhost, or domain
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 CORS: Allowing request from origin: ${origin || 'no origin'}`);
    }
    callback(null, true);
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
  optionsSuccessStatus: 204,
  maxAge: 86400, // Cache preflight requests for 24 hours
}));

// Increase body size limit to support uploading up to 1000 questions at once
// Default is 100kb, we'll set it to 10mb to handle large question papers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware (for debugging)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
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

// Start server - listen on all interfaces (0.0.0.0) to allow network access
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
    return; // Prevent multiple shutdown calls
  }
  isShuttingDown = true;
  
  console.log(`${signal} signal received: closing HTTP server`);
  
  try {
    // Disconnect Prisma
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected');
    
    // Close database pool
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately in development, let nodemon handle it
  // In production, you might want to exit here
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNCAUGHT_EXCEPTION').then(() => {
      process.exit(1);
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }
  // Don't exit immediately in development, let nodemon handle it
  // In production, you might want to exit here
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION').then(() => {
      process.exit(1);
    });
  }
});

module.exports = app;

