const { Queue } = require('bullmq');
const redisClient = require('../config/redis')
// AI Recommendation Queue
const aiRecommendationQueue = new Queue('ai-recommendations', { 
  redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

module.exports = { aiRecommendationQueue, redisClient };