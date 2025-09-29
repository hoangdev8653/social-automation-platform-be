const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log("req: ", req.role);

    if (!allowedRoles.includes(req.role)) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to access this resource.",
      });
    }
    next();
  };
};

module.exports = authorizeRoles;
