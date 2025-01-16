const sessionCheck = (req, res, next) => {
  if (!req.session) {
    return next(new Error('Session not available'));
  }
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

module.exports = sessionCheck; 