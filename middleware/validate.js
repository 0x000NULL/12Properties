const { validationResult } = require('express-validator');
const createError = require('http-errors');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(createError(422, { errors: errors.array() }));
  }
  next();
};

module.exports = validate; 