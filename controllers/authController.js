const userService = require('../services/userService');

exports.register = async (req, res) => {
  try {
    const result = await userService.register(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await userService.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
