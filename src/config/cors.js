import { whitelist_origin } from "../utils/constans.js";

const isRequestFromPostman = (req) => {
  // Postman requests typically have a User-Agent containing "Postman"
  const userAgent = req.headers["user-agent"] || "";
  return userAgent.includes("Postman");
};

export const corsOptions = {
  origin: function (origin, callback, req) {
    if (
      whitelist_origin.includes(origin) ||
      !origin || // For requests without a defined origin
      isRequestFromPostman(req) // Additional check for Postman headers
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  passReqToCallback: true, // Pass the request object to the origin function
};
