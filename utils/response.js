const success = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

const created = (res, message, data = null) => {
  success(res, message, data, 201);
};

const error = (res, message, statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = {
  success,
  created,
  error
};

// response ends