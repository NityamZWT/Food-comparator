const cluster = require("cluster");
const os = require("os");

if (cluster.isPrimary) {
    console.log(`🚀 Recommendation Cluster Master (PID: ${process.pid}) starting...`);
    
    const workerCount = parseInt(process.env.RECOMMENDATION_WORKERS) || Math.min(os.cpus().length, 4);
    console.log(`Spawning ${workerCount} recommendation workers...`);
    
    for (let i = 0; i < workerCount; i++) {
        const worker = cluster.fork({ 
            WORKER_TYPE: "recommendation",
            WORKER_ID: i + 1
        });
        console.log(`✅ Worker ${worker.process.pid} (ID: ${i + 1}) started`);
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        const newWorker = cluster.fork({ 
            WORKER_TYPE: "recommendation" 
        });
        console.log(`✅ New worker ${newWorker.process.pid} started`);
    });

    cluster.on("online", (worker) => {
        console.log(`✅ Worker ${worker.process.pid} is online`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
        console.log("\n🛑 Master received SIGTERM, shutting down workers...");
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    });

} else {
    require("../worker/recommendationWorker");
}