const cron = require('node-cron');
const scrapingService = require('../services/scrapingService');

class ScrapingJob {
  constructor() {
    this.isRunning = false;
    this.locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'];
    this.currentLocationIndex = 0;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalItemsScraped: 0
    };
  }

  start() {
    if (process.env.SCRAPING_ENABLED !== 'true') {
      console.log('⏸️  Scraping jobs disabled');
      return;
    }

    console.log('🕒 Starting REAL scraping jobs...');

    // Run every 4 hours (more reasonable for learning project)
    cron.schedule('0 */4 * * *', async () => {
      await this.runScrapingCycle();
    });

    // Run different location every 12 hours
    cron.schedule('0 */12 * * *', async () => {
      const location = this.getNextLocation();
      console.log(`🔄 Switching to location: ${location}`);
    });

    // Run immediately on startup in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Starting initial scrape in 30 seconds...');
      setTimeout(() => {
        this.runScrapingCycle();
      }, 30000);
    }

    console.log('✅ REAL Scraping jobs scheduled (every 4 hours)');
  }

  async runScrapingCycle() {
    if (this.isRunning) {
      console.log('⚠️  Scraping already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    this.stats.totalRuns++;
    const location = this.getNextLocation();
    
    console.log(`\n🚀 Starting REAL scraping cycle for ${location} at ${new Date().toISOString()}`);

    try {
      const results = await scrapingService.scrapeAllPlatforms(location);
      
      this.stats.successfulRuns++;
      this.stats.totalItemsScraped += results.totalScraped;
      this.lastRun = {
        timestamp: new Date().toISOString(),
        location: location,
        results: results
      };

      console.log(`✅ REAL Scraping cycle completed successfully!`);
      console.log(`📊 Stats: ${results.totalScraped} items scraped`);
      
      if (results.errors.length > 0) {
        console.log(`⚠️  Some platforms had errors:`, results.errors);
      }

    } catch (error) {
      this.stats.failedRuns++;
      console.error('❌ REAL Scraping cycle failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  getNextLocation() {
    const location = this.locations[this.currentLocationIndex];
    this.currentLocationIndex = (this.currentLocationIndex + 1) % this.locations.length;
    return location;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextLocation: this.getNextLocation(),
      locations: this.locations,
      stats: this.stats
    };
  }

  // Manual trigger for testing
  async triggerManualRun(location = null) {
    if (location) {
      this.currentLocationIndex = this.locations.indexOf(location);
      if (this.currentLocationIndex === -1) {
        this.currentLocationIndex = 0;
      }
    }
    return await this.runScrapingCycle();
  }
}

module.exports = new ScrapingJob();