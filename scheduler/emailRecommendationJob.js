const cron = require("node-cron");
const createQueues = require("../queue/index");
const { getUsers } = require("../services/userService");

class RecommendationScheduler {
    constructor() {
        this.cronJob = null;
        this.isRunning = false;
    }

    async triggerRecommendations() {
        if (this.isRunning) {
            console.log("⚠️  Job already running, skipping...");
            return;
        }

        this.isRunning = true;
        console.log("🕐 Starting recommendation job...");

        try {
            const { aiRecommendationQueue } = await createQueues();
            const users = await getUsers();

            if (!users.users || users.users.length === 0) {
                console.log("No active users found");
                this.isRunning = false;
                return;
            }

            // Filter active users who opted in for emails
            const activeUsers = users.users.filter(u => 
                u.isActive && u.emailPreferences?.recommendations !== false
            );

            console.log(`📧 Queueing recommendations for ${activeUsers.length} users`);

            // Batch users (5 users per batch)
            const batchSize = parseInt(process.env.BATCH_SIZE) || 5;
            const batches = [];

            for (let i = 0; i < activeUsers.length; i += batchSize) {
                batches.push(activeUsers.slice(i, i + batchSize));
            }

            // Add each batch to queue with staggered delays
            for (let i = 0; i < batches.length; i++) {
                await aiRecommendationQueue.add("generate-recommendations", {
                    batchId: `auto-${Date.now()}-${i}`,
                    users: batches[i],
                    timestamp: new Date().toISOString()
                }, {
                    priority: 10 - Math.min(i, 9),
                    delay: i * 1000 // 1 second between batches
                });
                
                console.log(`✅ Batch ${i + 1}/${batches.length} queued`);
            }

            console.log("🎉 All batches queued successfully");

        } catch (error) {
            console.error("❌ Scheduler error:", error);
        } finally {
            this.isRunning = false;
        }
    }

    start() {
        // Run daily at 8 AM
        const schedule = process.env.CRON_SCHEDULE || "0 8 * * *";
        
        this.cronJob = cron.schedule(schedule, async () => {
            await this.triggerRecommendations();
        });

        console.log(`⏰ Recommendation scheduler started (${schedule})`);
        return this.cronJob;
    }

    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log("🛑 Scheduler stopped");
        }
    }
}

module.exports = new RecommendationScheduler();