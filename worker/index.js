// (async () => {
//     const { Worker } = await import("bullmq");

//     const worker = new Worker("ai-recommendations", async job => {
//         console.log("Processing batch:", job.data.batchId);

//         // heavy work here
//     }, {
//         connection: {
//             host: "redis-16144.c323.us-east-1-2.ec2.cloud.redislabs.com",
//             port: 16144,
//             username: "default",
//             password: "iMGPKfO5bnbIUKBe8tUTgBgb39Oa4dNo",
//         }
//     });

//     worker.on("completed", job => {
//         console.log(`Job ${job.id} done`);
//     });

//     worker.on("failed", (job, err) => {
//         console.log(`Job ${job.id} failed: ${err.message}`);
//     });
// })();
