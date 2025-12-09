module.exports = {
    connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASS,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { 
            type: "exponential", 
            delay: 2000 
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 24 * 3600 // 24 hours
        },
        removeOnFail: {
            count: 50 // Keep last 50 failed jobs
        }
    }
};