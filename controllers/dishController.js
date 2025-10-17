const dishService = require('../services/dishService');
const scrapingService = require('../services/scrapingService');

exports.addDish = async (req, res) => {
  try {
    const dish = await dishService.addDish(req.body);
    res.json(dish);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDishes = async (req, res) => {
  const dishes = await dishService.getDishes(req.query);
  res.json(dishes);
};

// Optional: scrape and return dishes from external platform
exports.scrapeDishes = async (req, res) => {
  const { url } = req.query;
  const dishes = await scrapingService.scrapePlatform(url);
  res.json({ dishes });
};
