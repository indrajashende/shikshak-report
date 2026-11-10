
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import path from "node:path";
import { fileURLToPath } from "node:url";

import reportRoutes from "./routes/reportRoutes.js";

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

// Load server-side environment variables
dotenv.config({
  path: path.join(__dirname, ".env")
});

const app = express();

const PORT = process.env.PORT || 5000;

const allowedOrigins = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    }
  })
);

app.use(express.json({
  limit: "250kb"
}));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "खूप जास्त Requests आल्या आहेत. कृपया थोड्या वेळाने प्रयत्न करा."
  }
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Shikshak Report Studio Backend is running.",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    apiVersion: "dual-report-v2",
    dualReports: true
  });
});
// Frontend Build Files
const frontendPath = path.join(__dirname, "../dist");

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});
// Report APIs
app.use(
  "/api/reports",
  apiLimiter,
  reportRoutes
);

// Error Handler
app.use((error, req, res, next) => {
  console.error("Server Error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;

  let message = "सर्व्हरमध्ये समस्या आली. कृपया पुन्हा प्रयत्न करा.";

  if (error.status === 429) {
    message = "Gemini API ची Request Limit पूर्ण झाली आहे. AI Studio मधील Usage तपासा.";
  }

  if (error.status === 503 || error.status === 502) {
    message = "AI सेवा सध्या उपलब्ध नाही. थोड्या वेळाने प्रयत्न करा.";
  }

  if (status === 400) {
    message = error.message;
  }

  res.status(status).json({
    success: false,
    message
  });
});

app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log("Shikshak Report Studio Backend");
  console.log(`Server: http://localhost:${PORT}`);
  console.log("--------------------------------");
});
