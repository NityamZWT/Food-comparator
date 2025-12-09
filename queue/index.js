async function createQueues() {
    const { Queue } = await import("bullmq");
    const bullMQConfig = require("../config/bullmq");

    const aiRecommendationQueue = new Queue("ai-recommendations", {
        connection: bullMQConfig.connection,
        defaultJobOptions: {
            ...bullMQConfig.defaultJobOptions,
            priority: 10 // Higher priority
        }
    });

    const emailQueue = new Queue("email-queue", {
        connection: bullMQConfig.connection,
        defaultJobOptions: {
            ...bullMQConfig.defaultJobOptions,
            priority: 5
        }
    });

    return { aiRecommendationQueue, emailQueue };
}

module.exports = createQueues;
