require('dotenv').config();

const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const logRoutes = require('./routes/logRoutes');
const internRoutes = require('./routes/internRoutes');
const questionPaperRoutes = require('./routes/questionPaperRoutes');
const studentTestRoutes = require('./routes/studentTestRoutes');
const studentProfileRoutes = require('./routes/studentProfileRoutes');
const timeTrackingRoutes = require('./routes/timeTrackingRoutes');
const adminTimeTrackingRoutes = require('./routes/adminTimeTrackingRoutes');
const domainRoutes = require('./routes/domainRoutes');
const testAttemptRoutes = require('./routes/testAttemptRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const activityRoutes = require('./routes/activityRoutes');
const nocRoutes = require('./routes/nocRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const projectRoutes = require('./routes/projectRoutes');
const internshipStatusRoutes = require('./routes/internshipStatusRoutes');
const videoTrackingRoutes = require('./routes/videoTrackingRoutes');
const videoAnalyticsRoutes = require('./routes/videoAnalyticsRoutes');
const openStudentRoutes = require('./routes/openStudentRoutes');
const errorHandler = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/securityHeaders');
const { sanitizeInput, validateParams } = require('./middleware/inputValidation');
const { prisma } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - THIS MUST BE FIRST
// When credentials: true, browser requires a concrete Access-Control-Allow-Origin (not *).
// Development: reflect request origin. Production/Deployment: only allow FRONTEND_URL (cross-domain + cookies).
const isDev = process.env.NODE_ENV === 'development';
const allowedOrigins = (process.env.FRONTEND_URL || (isDev ? 'http://localhost:5173' : 'https://scholar-flex-seven.vercel.app')).split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, allowedOrigins[0] || true);
    if (isDev) return callback(null, origin);
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    callback(null, allowedOrigins[0] || true);
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
    'Access-Control-Request-Headers',
    'x-open-session-token'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security headers - Add security headers to all responses
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Input sanitization - AFTER body parsing to sanitize parsed data
app.use(sanitizeInput);

// Input validation - AFTER sanitization to validate clean data
app.use(validateParams);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware (for debugging)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    // console.log(`📨 ${req.method} ${req.path} from ${req.get('origin') || 'no origin'}`);
    res.on('finish', () => {
      const duration = Date.now() - start;
      // console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
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
// IMPORTANT: Mount specific admin routes BEFORE the catch-all /api/admin route
// This ensures /api/admin/time-tracking/* matches before /api/admin/:id
app.use('/api/admin/time-tracking', adminTimeTrackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/question-papers', questionPaperRoutes);
app.use('/api/student', studentTestRoutes);
app.use('/api/student/profile', studentProfileRoutes);
app.use('/api/student/time-tracking', timeTrackingRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/test-attempts', testAttemptRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api', nocRoutes);
app.use('/api', feedbackRoutes);
// Note: Admin routes for evaluations, projects, and internship status are in adminRoutes.js
// to avoid conflicts with /api/admin/:id route. Student routes are kept separate below.
app.use('/api', projectRoutes); // Student project routes (/api/student/projects)
app.use('/api', internshipStatusRoutes); // Student internship status route (/api/student/internship/status)
app.use('/api/video-tracking', videoTrackingRoutes);
app.use('/api/video-tracking', require('./routes/enhancedVideoTrackingRoutes'));
app.use('/api/video-analytics', videoAnalyticsRoutes);
app.use('/api/video-analytics', require('./routes/enhancedVideoAnalyticsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/open', openStudentRoutes);
app.use('/api/public', require('./routes/publicRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Function to start the server (used by both cluster and single mode)
function startServer() {
  const timeTrackingController = require('./controllers/timeTrackingController');
  const HEARTBEAT_CRON_MS = 5 * 60 * 1000; // 5 minutes

  const server = app.listen(PORT, '0.0.0.0', () => {
    const workerId = cluster.isWorker ? ` [Worker ${cluster.worker.id}]` : '';
    console.log(`🚀 Server running on port ${PORT}${workerId}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🌍 Server accessible on: http://0.0.0.0:${PORT} and http://localhost:${PORT}`);

    // Only run cron job once - in single mode or in the first worker in cluster mode
    // This prevents duplicate cron jobs when running multiple workers
    if (!cluster.isWorker || (cluster.isWorker && cluster.worker.id === 1)) {
      // Auto-finish time tracking sessions with no heartbeat (e.g. laptop shutdown, closed tab)
      setInterval(() => {
        timeTrackingController.autoFinishStaleSessions().catch((err) => {
          console.error('Time tracking cron error:', err);
        });
      }, HEARTBEAT_CRON_MS);
      console.log('⏰ Time tracking cron job started');
    }
  });

  // Keep server reference to prevent garbage collection
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }
    console.error('❌ Server error:', error);
  });

  // Graceful shutdown
  let isShuttingDown = false;

  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    
    const workerId = cluster.isWorker ? ` [Worker ${cluster.worker.id}]` : '';
    console.log(`${signal} signal received: closing HTTP server${workerId}`);
    
    return new Promise((resolve) => {
      server.close(async () => {
        console.log(`HTTP server closed${workerId}`);
        try {
          await prisma.$disconnect();
          console.log(`✅ Prisma disconnected${workerId}`);
          resolve();
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          resolve();
          process.exit(1);
        }
      });
    });
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

  return server;
}

// Cluster mode configuration
const ENABLE_CLUSTER = process.env.ENABLE_CLUSTER === 'true' || 
                       (process.env.NODE_ENV === 'production' && process.env.ENABLE_CLUSTER !== 'false');
const NUM_WORKERS = parseInt(process.env.NUM_WORKERS || '0', 10) || os.cpus().length;

if (ENABLE_CLUSTER && cluster.isPrimary) {
  // Primary process - spawn workers
  console.log(`🔄 Starting cluster mode with ${NUM_WORKERS} workers`);
  console.log(`💻 CPU cores available: ${os.cpus().length}`);
  
  // Spawn workers
  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  // Handle worker exit - restart if crashed
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️  Worker ${worker.id} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  // Handle worker online
  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.id} is online`);
  });

  // Graceful shutdown for cluster
  const shutdownCluster = async (signal) => {
    console.log(`${signal} received. Shutting down cluster...`);
    
    // Disconnect all workers
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
    
    // Wait a bit for workers to finish
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdownCluster('SIGTERM'));
  process.on('SIGINT', () => shutdownCluster('SIGINT'));
} else {
  // Single process mode (development or when cluster is disabled)
  startServer();
}

module.exports = app;