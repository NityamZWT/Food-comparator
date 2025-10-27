const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { dishValidation } = require('../utils/validationSchemas');

// Public routes
router.get('/', dishController.getDishes);
router.get('/:id', dishController.getDishById);
router.get('/:id/price-history', dishController.getPriceHistory);

// Admin only routes
router.post('/', 
  authenticate, 
  authorize('admin'), 
  validate(dishValidation.create),
  dishController.createDish
);

router.put('/:id', 
  authenticate, 
  authorize('admin'), 
  validate(dishValidation.update),
  dishController.updateDish
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'), 
  dishController.deleteDish
);

module.exports = router;