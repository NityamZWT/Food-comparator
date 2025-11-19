const createQueues = require("../queue/index");

const cron = require("node-cron");
const { getUsers } = require("../services/userService");

cron.schedule("* * * * *", async () => {
    console.log("Cron running...");

    const { aiRecommendationQueue } =  await createQueues();

    const users = await getUsers();

    if (users.users.length === 0) return;

    const batchSize = 5;
    const batches = [];

    for (let i = 0; i < users.users.length; i += batchSize) {
        batches.push(users.users.slice(i, i + batchSize));
    }
    console.log(batches, 'batches...');
    
    for (let i = 0; i < batches.length; i++) {
        await aiRecommendationQueue.add("process-user", {
            batchId: i + 1,
            users: batches[i],
        });
        console.log("Batch added:", i + 1);
    }
});
