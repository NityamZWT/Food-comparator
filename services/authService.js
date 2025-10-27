const { User } = require('../models');
const jwtService = require('./jwtService');

exports.register = async (userData) => {
  // Convert preferences to string for MySQL
  if (userData.preferences && typeof userData.preferences === 'object') {
    userData.preferences = JSON.stringify(userData.preferences);
  }

  const existingUser = await User.findOne({ where: { email: userData.email } });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const user = await User.create(userData);
  
  const token = jwtService.generateToken({ 
    id: user.id, 
    email: user.email, 
    role: user.role 
  });

  return { 
    user: user.toJSON(), 
    token 
  };
};

exports.login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (!user.is_active) {
    throw new Error('Account is deactivated');
  }

  const isValidPassword = await user.validatePassword(password);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const token = jwtService.generateToken({ 
    id: user.id, 
    email: user.email, 
    role: user.role 
  });

  return { 
    user: user.toJSON(), 
    token 
  };
};

exports.refreshToken = async (refreshToken) => {
  throw new Error('Refresh token not implemented');
};