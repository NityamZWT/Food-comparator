// ==================== server.js ====================
// Complete server with scraping, scheduler, and queue monitoring

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const compression = require("compression");

const sequelize = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const loggingMiddleware = require("./middleware/requestLogger");
const redisClient = require("./config/redis");

// Routes
const authRoutes = require("./routes/authRoutes");
const dishRoutes = require("./routes/dishRoutes");
const searchRoutes = require("./routes/searchRoutes");
const adminRoutes = require("./routes/adminRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");

// Services & Jobs
const scrapingJob = require("./scheduler/scrapingJob");
const recommendationScheduler = require("./scheduler/emailRecommendationJob");

const app = express();
const PORT = process.env.PORT || 5000;

// ============== MIDDLEWARE ==============

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Compression
app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      if (req.path.includes("/health-check")) {
        return false;
      }
      if (res.getHeader("Content-Encoding")) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Logging
app.use(loggingMiddleware);

// ============== ROUTES ==============

app.use("/api/auth", authRoutes);
app.use("/api/dishes", dishRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recommendations", recommendationRoutes);

// ============== HEALTH & STATUS ENDPOINTS ==============

// Health check
app.get("/api/health", async (req, res) => {
  try {
    // Check Redis connection
    let redisStatus = "disconnected";
    try {
      await redisClient.ping();
      redisStatus = "connected";
    } catch (err) {
      redisStatus = "error";
    }

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: "connected",
        redis: redisStatus,
        scraping: process.env.SCRAPING_ENABLED === "true" ? "enabled" : "disabled",
        scheduler: process.env.CRON_SCHEDULER_ENABLED === "true" ? "enabled" : "disabled",
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

// Public status endpoint (detailed)
app.get("/api/public/status", (req, res) => {
  const scrapingStatus = scrapingJob.getStatus();

  res.json({
    scraping: {
      isRunning: scrapingStatus.isRunning,
      nextRun: "every 4 hours",
      lastRun: scrapingStatus.lastRun,
      enabled: process.env.SCRAPING_ENABLED === "true"
    },
    scheduler: {
      enabled: process.env.CRON_SCHEDULER_ENABLED === "true",
      schedule: process.env.CRON_SCHEDULE || "0 8 * * *",
      description: "Daily recommendations at 8 AM"
    },
    apis: {
      spoonacular: !!process.env.SPOONACULAR_API_KEY
        ? "connected"
        : "not configured",
      edamam:
        process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY
          ? "connected"
          : "not configured",
      groq: !!process.env.GROQ_API_KEY ? "connected" : "not configured",
    },
    database: "connected",
    redis: "connected",
    version: "3.0.0",
  });
});

// ============== RECOMMENDATION ENDPOINTS ==============

// Manual trigger for recommendations (for testing)
app.post("/api/trigger-recommendations", async (req, res) => {
  try {
    await recommendationScheduler.triggerRecommendations();
    
    res.json({
      success: true,
      message: "Recommendation job triggered manually",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error triggering recommendations:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Test single user recommendation (for debugging)
app.post("/api/test-single-user", async (req, res) => {
  const { userId, email } = req.body;
  const createQueues = require("./queue/index");

  try {
    const { aiRecommendationQueue } = await createQueues();
    
    await aiRecommendationQueue.add("generate-recommendations", {
      batchId: `test-${Date.now()}`,
      users: [{
        id: userId || 1,
        email: email || "test@example.com",
        name: "Test User",
        location: "Mumbai",
        isActive: true
      }],
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      message: "Test job queued for single user",
      userId: userId || 1,
      checkLogs: "Monitor worker logs to see progress"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Queue monitoring endpoint
app.get("/api/queue-stats", async (req, res) => {
  const createQueues = require("./queue/index");

  try {
    const { aiRecommendationQueue, emailQueue } = await createQueues();

    const [aiWaiting, aiActive, aiCompleted, aiFailed] = await Promise.all([
      aiRecommendationQueue.getWaitingCount(),
      aiRecommendationQueue.getActiveCount(),
      aiRecommendationQueue.getCompletedCount(),
      aiRecommendationQueue.getFailedCount()
    ]);

    const [emailWaiting, emailActive, emailCompleted, emailFailed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount()
    ]);

    res.json({
      aiRecommendationQueue: {
        waiting: aiWaiting,
        active: aiActive,
        completed: aiCompleted,
        failed: aiFailed,
        total: aiWaiting + aiActive + aiCompleted + aiFailed
      },
      emailQueue: {
        waiting: emailWaiting,
        active: emailActive,
        completed: emailCompleted,
        failed: emailFailed,
        total: emailWaiting + emailActive + emailCompleted + emailFailed
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Clear failed jobs (admin endpoint)
app.post("/api/admin/queue/clear-failed", async (req, res) => {
  const createQueues = require("./queue/index");

  try {
    const { aiRecommendationQueue, emailQueue } = await createQueues();

    const [aiCleared, emailCleared] = await Promise.all([
      aiRecommendationQueue.clean(0, 0, "failed"),
      emailQueue.clean(0, 0, "failed")
    ]);

    res.json({
      success: true,
      cleared: {
        aiRecommendations: aiCleared,
        emails: emailCleared
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ============== ERROR HANDLING ==============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use(errorHandler);

// ============== DATABASE SYNC & SERVER START ==============

const startServer = async () => {
  try {
    console.log("\n🚀 Starting Food Comparator V3...\n");

    // ============== Database Connection ==============
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    await sequelize.sync({ alter: false });
    console.log("✅ Database models synchronized");

    // ============== Redis Connection ==============
    try {
      await redisClient.connect();
      console.log("✅ Redis connected successfully");

      // Test Redis
      await redisClient.set("health-check", "ok");
      const result = await redisClient.get("health-check");
      console.log(`✅ Redis working (test result: ${result})`);
    } catch (error) {
      console.error("❌ Redis connection failed:", error.message);
      console.log("⚠️  Queue features will be unavailable");
    }

    // ============== Start HTTP Server ==============
    app.listen(PORT, () => {
      console.log(`\n🌐 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // ============== Display API Status ==============
      console.log("\n📡 Connected APIs:");
      console.log(
        `  ${process.env.SPOONACULAR_API_KEY ? "✅" : "⚠️ "} Spoonacular: ${
          process.env.SPOONACULAR_API_KEY ? "Configured" : "Not configured"
        }`
      );
      console.log(
        `  ${process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY ? "✅" : "⚠️ "} Edamam: ${
          process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY ? "Configured" : "Not configured"
        }`
      );
      console.log(
        `  ${process.env.GROQ_API_KEY ? "✅" : "⚠️ "} Groq AI: ${
          process.env.GROQ_API_KEY ? "Configured" : "Not configured (AI disabled)"
        }`
      );
      console.log(
        `  ${process.env.SMTP_USER && process.env.SMTP_PASS ? "✅" : "⚠️ "} Email (SMTP): ${
          process.env.SMTP_USER && process.env.SMTP_PASS ? "Configured" : "Not configured"
        }`
      );

      // ============== Start Background Jobs ==============
      console.log("\n🔧 Background Jobs:");

      // Start scraping job if enabled
      if (process.env.SCRAPING_ENABLED === "true") {
        scrapingJob.start();
        console.log("  ✅ Scraping job started (runs every 4 hours)");
      } else {
        console.log("  ⚠️  Scraping job disabled (set SCRAPING_ENABLED=true)");
      }

      // Start recommendation scheduler if enabled
      if (process.env.CRON_SCHEDULER_ENABLED === "true") {
        recommendationScheduler.start();
        const schedule = process.env.CRON_SCHEDULE || "0 8 * * *";
        console.log(`  ✅ Recommendation scheduler started (${schedule})`);
        console.log(`     Next run: Daily at 8:00 AM`);
      } else {
        console.log("  ⚠️  Recommendation scheduler disabled (set CRON_SCHEDULER_ENABLED=true)");
      }

      // ============== Display Available Endpoints ==============
      console.log("\n📚 Available Endpoints:");
      console.log("  Authentication:");
      console.log("    POST   /api/auth/register - Register new user");
      console.log("    POST   /api/auth/login - Login user");
      
      console.log("\n  Dishes:");
      console.log("    GET    /api/dishes - Get all dishes");
      console.log("    GET    /api/search - Search dishes");
      
      console.log("\n  Recommendations:");
      console.log("    GET    /api/recommendations/personalized - Get AI recommendations");
      console.log("    GET    /api/recommendations/suggestions - Get meal suggestions");
      console.log("    POST   /api/trigger-recommendations - Trigger batch recommendations (manual)");
      console.log("    POST   /api/test-single-user - Test single user recommendation");
      
      console.log("\n  Monitoring:");
      console.log("    GET    /api/health - Health check");
      console.log("    GET    /api/public/status - Public status");
      console.log("    GET    /api/queue-stats - Queue statistics");
      
      console.log("\n  Admin:");
      console.log("    POST   /api/admin/scrape/trigger - Trigger scraping");
      console.log("    POST   /api/admin/queue/clear-failed - Clear failed jobs");

      // ============== Worker Instructions ==============
      console.log("\n🔧 Worker Setup:");
      console.log("  To process recommendations and send emails, run:");
      console.log("    Terminal 2: npm run worker:recommendations");
      console.log("    Terminal 3: npm run worker:emails");
      console.log("  Or run both: npm run workers\n");

      // ============== Configuration Summary ==============
      console.log("⚙️  Configuration:");
      console.log(`  Batch Size: ${process.env.BATCH_SIZE || 5} users per batch`);
      console.log(`  Recommendation Workers: ${process.env.RECOMMENDATION_WORKERS || 4}`);
      console.log(`  Email Workers: ${process.env.EMAIL_WORKERS || 4}`);
      console.log(`  Email Rate Limit: ${process.env.EMAIL_RATE_LIMIT_MAX || 50} per minute\n`);

    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// ============== GRACEFUL SHUTDOWN ==============

const gracefulShutdown = async (signal) => {
  console.log(`\n⏹️  ${signal} signal received: shutting down gracefully...`);
  
  try {
    // Stop schedulers
    if (process.env.CRON_SCHEDULER_ENABLED === "true") {
      recommendationScheduler.stop();
      console.log("✅ Recommendation scheduler stopped");
    }

    if (process.env.SCRAPING_ENABLED === "true") {
      scrapingJob.stop();
      console.log("✅ Scraping job stopped");
    }

    // Close Redis connection
    try {
      await redisClient.quit();
      console.log("✅ Redis connection closed");
    } catch (err) {
      console.log("⚠️  Redis already disconnected");
    }

    // Close database connection
    await sequelize.close();
    console.log("✅ Database connection closed");

    console.log("👋 Goodbye!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// ============== START APPLICATION ==============

startServer();

module.exports = app;