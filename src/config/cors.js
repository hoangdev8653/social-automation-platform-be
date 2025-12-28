const { whitelist_origin } = require("../utils/constans");

const isRequestFromPostman = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  return userAgent.includes("Postman");
};

const corsOptions = {
  origin: function (origin, callback, req) {
    if (
      whitelist_origin.includes(origin) ||
      !origin ||
      isRequestFromPostman(req)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  passReqToCallback: true,
};

module.exports = corsOptions;
