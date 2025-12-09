(async () => {
    const { Worker } = await import("bullmq");
    const bullMQConfig = require("../config/bullmq");
    const aiRecommendationService = require("../services/aiRecommendationService");
    const createQueues = require("../queue/index");

    const workerId = process.env.WORKER_ID || process.pid;
    console.log(`👷 Recommendation Worker ${workerId} (PID: ${process.pid}) initializing...`);

    const worker = new Worker("ai-recommendations", async (job) => {
        const { batchId, users } = job.data;
        
        console.log(`🤖 Worker ${workerId} processing batch ${batchId} (${users.length} users)`);

        const { emailQueue } = await createQueues();
        const results = [];

        for (const user of users) {
            try {
                // Generate AI recommendations
                const recommendations = await aiRecommendationService.generateRecommendations(
                    user.id,
                    user.location || 'Mumbai',
                    10
                );

                if (recommendations.recommendations && recommendations.recommendations.length > 0) {
                    // Queue email job
                    await emailQueue.add("send-recommendation-email", {
                        userId: user.id,
                        userEmail: user.email,
                        userName: user.name,
                        recommendations: recommendations.recommendations,
                        location: user.location
                    }, {
                        attempts: 3,
                        backoff: { type: "exponential", delay: 5000 }
                    });

                    results.push({ 
                        userId: user.id, 
                        status: "queued",
                        count: recommendations.recommendations.length 
                    });

                    console.log(`✉️  Email queued for ${user.name} (${user.email}) - ${recommendations.recommendations.length} recommendations`);
                } else {
                    results.push({ 
                        userId: user.id, 
                        status: "no_recommendations" 
                    });
                    console.log(`⚠️  No recommendations for ${user.name}`);
                }

            } catch (error) {
                console.error(`❌ Error processing user ${user.id}:`, error.message);
                results.push({ 
                    userId: user.id, 
                    status: "error",
                    error: error.message 
                });
            }

            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return { 
            batchId, 
            processed: results.length,
            successful: results.filter(r => r.status === 'queued').length,
            failed: results.filter(r => r.status === 'error').length,
            results 
        };

    }, {
        connection: bullMQConfig.connection,
        concurrency: parseInt(process.env.RECOMMENDATION_CONCURRENCY) || 2
    });

    worker.on("completed", (job, result) => {
        console.log(`✅ Batch ${job.data.batchId} completed by worker ${workerId}`);
        console.log(`   📊 Stats: ${result.successful} queued, ${result.failed} failed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`❌ Batch ${job?.data?.batchId} failed in worker ${workerId}:`, err.message);
    });

    worker.on("error", (err) => {
        console.error(`❌ Worker ${workerId} error:`, err);
    });

    console.log(`✅ Recommendation Worker ${workerId} ready and listening`);
})();
