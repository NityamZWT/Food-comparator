const scrapingService = require('../services/scrapingService');
const scrapingJob = require('../jobs/scrapingJob');
const response = require('../utils/response');
const { sequelize, Dish, PriceHistory } = require('../models'); // added sequelize import


exports.triggerScraping = async (req, res, next) => {
  try {
    const { location, immediate = false } = req.body;
    
    let results;
    if (immediate) {
      // Immediate scrape using service directly
      results = await scrapingService.triggerManualScrape(location || 'Mumbai');
    } else {
      // Use job system
      results = await scrapingJob.triggerManualRun(location);
    }
    
    response.success(res, 'Scraping completed successfully', results);
  } catch (error) {
    next(error);
  }
};

exports.getScrapingStatus = async (req, res, next) => {
  try {
    const status = scrapingJob.getStatus();
    response.success(res, 'Scraping status retrieved', status);
  } catch (error) {
    next(error);
  }
};

exports.getScrapingStats = async (req, res, next) => {
  try {
    const totalDishes = await Dish.count();
    const totalPriceRecords = await PriceHistory.count();
    const platforms = await Dish.findAll({
      attributes: [
        'platform',
        [sequelize.fn('COUNT', sequelize.col('platform')), 'count']
      ],
      group: ['platform']
    });

    const stats = {
      ...scrapingJob.stats,
      database: {
        totalDishes,
        totalPriceRecords,
        platforms
      }
    };
    
    response.success(res, 'Scraping stats retrieved', stats);
  } catch (error) {
    next(error);
  }
};

exports.getPublicStatus = async (req, res, next) => {
  try {
    const status = scrapingJob.getStatus();
    // Return only public information
    const publicStatus = {
      isRunning: status.isRunning,
      lastRun: status.lastRun ? {
        timestamp: status.lastRun.timestamp,
        location: status.lastRun.location,
        totalItems: status.lastRun.results.totalScraped
      } : null,
      nextLocation: status.nextLocation
    };
    
    response.success(res, 'Public scraping status retrieved', publicStatus);
  } catch (error) {
    next(error);
  }
};