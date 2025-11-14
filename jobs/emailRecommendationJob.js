const cron = require("node-cron");
const EmailService = require("../services/emailService");
const { getUsers } = require("../services/userService");
const { aiRecommendationQueue } = require("../queue");

console.log("INSIDE CRONJOBS-----------");
// const cronJob = cron.schedule('*/2 * * * * *', () => {
//   console.log('Running every 2 minutes (even minutes)');
//   });

const cronJob = cron.schedule(
  "* * * * *",
  async (opt) => {
    console.log("Running every hour", opt);
    // EmailService.sendEmail('randomnityam@gmail.com')
    const usersData = await getUsers();
    if (usersData.users.length === 0) {
      console.log("⏭️ No users to process. Skipping...");
      return;
    }

    // Pass raw user data directly to queue - NO SEPARATE PREPARATION
    console.log("📨 Passing raw user data directly to AI queue...", usersData);

    // Create batches of raw user data
    const batchSize = 5;
    const batches = [];

    for (let i = 0; i < usersData.users.length; i += batchSize) {
      batches.push(usersData.users.slice(i, i + batchSize));
      console.log("inside batches.....", batches);
      
    }

    console.log(
      `📦 Created ${batches.length} batches of ${batchSize} users each ${batches}`
    );

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      await aiRecommendationQueue.add(
        "process-user-recommendations",
        {
          batchId: i + 1,
          users: batch, // RAW USER DATA - no preparation
          totalBatches: batches.length,
          timestamp: new Date().toISOString(),
        },
      );

      console.log(`✅ Added batch ${i + 1}/${batches.length} to AI queue`);
      console.log(
        `   Users in batch: ${batch.map((user) => user.name).join(", ")}`
      );
    }
  },
  {
    noOverlap: true,
  }
);

module.exports = { cronJob };
