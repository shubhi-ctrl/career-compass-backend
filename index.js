const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
const careerRoutes = require("./routes/careerRoutes");
app.use("/api/careers", careerRoutes);
const analysisRoutes = require("./routes/analysis");
app.use("/api/analysis", analysisRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "Career Compass Backend is running!" 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: "Something went wrong!" 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
