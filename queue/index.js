// queue/index.js
const redisClient = require("../config/redis");

async function createQueues() {
    const { Queue } = await import("bullmq");

    const aiRecommendationQueue = new Queue("ai-recommendations", {
        connection: {
            host: "redis-16144.c323.us-east-1-2.ec2.cloud.redislabs.com",
            port: 16144,
            username: "default",
            password: "iMGPKfO5bnbIUKBe8tUTgBgb39Oa4dNo",
        },
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
        }
    });

    return { aiRecommendationQueue };
}

module.exports = createQueues;
