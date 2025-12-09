(async () => {
    const { Worker } = await import("bullmq");
    const bullMQConfig = require("../config/bullmq");
    const emailService = require("../services/emailService");

    const workerId = process.env.WORKER_ID || process.pid;
    console.log(`👷 Email Worker ${workerId} (PID: ${process.pid}) initializing...`);

    const worker = new Worker("email-queue", async (job) => {
        const { userId, userEmail, userName, recommendations, location } = job.data;
        
        console.log(`📨 Worker ${workerId} sending email to ${userEmail}`);

        try {
            await emailService.sendRecommendationEmail({
                to: userEmail,
                userName: userName,
                recommendations: recommendations,
                location: location
            });

            console.log(`✅ Email sent to ${userName} (${userEmail})`);

            return { 
                userId, 
                email: userEmail,
                status: "sent",
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Failed to send email to ${userEmail}:`, error.message);
            throw error; // Trigger retry
        }

    }, {
        connection: bullMQConfig.connection,
        concurrency: parseInt(process.env.EMAIL_CONCURRENCY) || 5,
        limiter: {
            max: parseInt(process.env.EMAIL_RATE_LIMIT_MAX) || 50,
            duration: parseInt(process.env.EMAIL_RATE_LIMIT_DURATION) || 60000 // 1 minute
        }
    });

    worker.on("completed", (job, result) => {
        console.log(`✅ Email job ${job.id} completed by worker ${workerId}`);
    });

    worker.on("failed", (job, err) => {
        console.error(`❌ Email job ${job?.id} failed in worker ${workerId}:`, err.message);
    });

    worker.on("error", (err) => {
        console.error(`❌ Worker ${workerId} error:`, err);
    });

    console.log(`✅ Email Worker ${workerId} ready and listening`);
})();