// ==================== server.js ====================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const sequelize = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const loggingMiddleware = require('./middleware/logging');

// Routes
const authRoutes = require('./routes/authRoutes');
const dishRoutes = require('./routes/dishRoutes');
const searchRoutes = require('./routes/searchRoutes');
const adminRoutes = require('./routes/adminRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

// Services
const scrapingJob = require('./jobs/scrapingJob');

const app = express();
const PORT = process.env.PORT || 5000;

// ============== MIDDLEWARE ==============

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use(loggingMiddleware);

// ============== ROUTES ==============

app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    scrapingEnabled: process.env.SCRAPING_ENABLED === 'true'
  });
});

// Public status endpoint
app.get('/api/public/status', (req, res) => {
  const scrapingJob = require('./jobs/scrapingJob');
  const status = scrapingJob.getStatus();
  
  res.json({
    scraping: {
      isRunning: status.isRunning,
      nextRun: 'every 4 hours',
      lastRun: status.lastRun
    },
    apis: {
      spoonacular: !!process.env.SPOONACULAR_API_KEY ? 'connected' : 'not configured',
      edamam: (process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY) ? 'connected' : 'not configured',
      groq: !!process.env.GROQ_API_KEY ? 'connected' : 'not configured'
    },
    database: 'connected',
    version: '2.0.0'
  });
});

// ============== ERROR HANDLING ==============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// ============== DATABASE SYNC & SERVER START ==============

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync database models
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔄 Scraping enabled: ${process.env.SCRAPING_ENABLED === 'true' ? 'Yes' : 'No'}`);
      
      // Start scraping job if enabled
      if (process.env.SCRAPING_ENABLED === 'true') {
        scrapingJob.start();
      }

      // Display API status
      console.log('\n📡 Connected APIs:');
      console.log(`  ✓ Spoonacular: ${process.env.SPOONACULAR_API_KEY ? 'Configured' : '⚠️  Not configured'}`);
      console.log(`  ✓ Edamam: ${process.env.EDAMAM_APP_ID ? 'Configured' : '⚠️  Not configured'}`);
      console.log(`  ✓ Groq: ${process.env.GROQ_API_KEY ? 'Configured' : '⚠️  Not configured (AI disabled)'}`);
      
      console.log('\n📚 Available Endpoints:');
      console.log('  POST   /api/auth/register - Register new user');
      console.log('  POST   /api/auth/login - Login user');
      console.log('  GET    /api/dishes - Get all dishes');
      console.log('  GET    /api/search - Search dishes');
      console.log('  GET    /api/recommendations/personalized - Get AI recommendations');
      console.log('  GET    /api/recommendations/suggestions - Get meal suggestions');
      console.log('  POST   /api/admin/scrape/trigger - Trigger scraping (admin)');
      console.log('  GET    /api/health - Health check');
      console.log('  GET    /api/public/status - Public status\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ============== GRACEFUL SHUTDOWN ==============

process.on('SIGTERM', async () => {
  console.log('\n⏹️  SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⏹️  SIGINT signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

// ============== START APPLICATION ==============

startServer();

module.exports = app;