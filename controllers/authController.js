const userService = require('../services/userService');
const response = require('../utils/response');

exports.register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body);
    response.created(res, 'User registered successfully', result);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    response.success(res, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await userService.refreshToken(refreshToken);
    response.success(res, 'Token refreshed', result);
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    response.success(res, 'Logout successful');
  } catch (error) {
    next(error);
  }
};