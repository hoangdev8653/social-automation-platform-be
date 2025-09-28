const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const { corsOptions } = require("../src/config/cors.js");
const { connectDB } = require("./config/connectDB.js");

dotenv.config();

const app = express();

connectDB();
// Middleware
app.use(express.json());
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Social Automation Platform Backend is running 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
