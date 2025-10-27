const Joi = require('joi');

exports.authValidation = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    location: Joi.string().optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

exports.dishValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    category: Joi.string().valid('food', 'grocery', 'beverage').required(),
    brand: Joi.string().optional(),
    platform: Joi.string().valid('swiggy', 'zomato', 'instamart', 'blinkit').required(),
    price: Joi.number().positive().required(),
    original_price: Joi.number().positive().optional(),
    discount_percent: Joi.number().min(0).max(100).optional(),
    rating: Joi.number().min(0).max(5).optional(),
    location: Joi.string().required(),
    cuisine: Joi.string().optional()
  }),

  update: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    price: Joi.number().positive().optional(),
    original_price: Joi.number().positive().optional(),
    discount_percent: Joi.number().min(0).max(100).optional(),
    rating: Joi.number().min(0).max(5).optional(),
    availability: Joi.boolean().optional()
  })
};