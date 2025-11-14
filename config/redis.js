const { createClient } = require('redis')

const redisClient = createClient({
    username: 'default',
    password: 'iMGPKfO5bnbIUKBe8tUTgBgb39Oa4dNo',
    socket: {
        host: 'redis-16144.c323.us-east-1-2.ec2.cloud.redislabs.com',
        port: 16144
    }
});

module.exports = redisClient

