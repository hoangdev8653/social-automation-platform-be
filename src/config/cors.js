import { whitelist_origin } from "../utils/constans.js";

export const corsOptions = {
  origin: function (origin, callback) {
    if (
      whitelist_origin.includes(origin) ||
      !origin || // For requests without a defined origin
      isRequestFromPostman() // Additional check for Postman headers
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
