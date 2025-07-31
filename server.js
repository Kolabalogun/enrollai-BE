const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const caqhAuthRoutes = require("./routes/caqhauth");
const applicationRoutes = require("./routes/applicationRoutes.js");
const organizationRoutes = require("./routes/organizationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const activityRoute = require("./routes/activityRoute");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());

connectDB();

app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://enrollai.netlify.app",
  "http://localhost:5000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/caqhauth", caqhAuthRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/activity", activityRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
