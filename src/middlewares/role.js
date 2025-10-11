const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to access this resource.",
      });
    }
    next();
  };
};

module.exports = authorizeRoles;
