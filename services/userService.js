const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwtService = require('./jwtService');

exports.register = async (data) => {
  const user = await User.create(data);
  return { userId: user.id };
};

exports.login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error('User not found');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Wrong password');

  const token = jwtService.generateToken({ id: user.id, role: user.role });
  return { token };
};
