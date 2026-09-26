import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes.js";
import carRoutes from "./routes/car.routes.js";
import managerRoutes from "./routes/manager.routes.js";
import favoriteRoutes from "./routes/favorite.routes.js";
import errorHandler from "./middlewares/error.middleware.js";
import { globalLimiter } from "./middlewares/rateLimiter.middleware.js";
import { csrfProtection } from "./middlewares/csrf.middleware.js";
import { ApiError } from "./utils/apiHelpers.js";

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// STEP 21 — SECURITY LAYERS
// Order matters: security middleware runs before everything else.
// ─────────────────────────────────────────────────────────────────────────────

// 1. Helmet — sets 11 HTTP security headers in one call:
//    Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
//    Strict-Transport-Security, Referrer-Policy, and more.
app.use(helmet());

// 2. Global rate limiter — 100 req / 15min per IP across all routes.
//    Specific stricter limiters (authLimiter, uploadLimiter) are applied
//    directly on individual routes in the route files.
app.use(globalLimiter);

// 3. MongoDB sanitizer — strips $ and . from req.body, req.params, req.query.
//    Prevents NoSQL injection attacks like: { "email": { "$gt": "" } }
app.use(
  mongoSanitize({
    replaceWith: "_", // replace forbidden chars with _ instead of removing
    onSanitize: ({ req, key }) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `⚠️  Sanitized field: ${key} in ${req.method} ${req.path}`,
        );
      }
    },
  }),
);

// 4. CORS — only allow requests from the configured frontend origin.
//    credentials:true is required for cookies (refresh token) to work cross-origin.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Device-Id",
      "X-CSRF-Token",
      "Idempotency-Key",
      "X-Admin-Setup-Token",
    ],
  }),
);

// ─── Body parsers ──────────────────────────────────────────────────────────────
// Limit body size — prevents request body attacks.
// Multipart/form-data (file uploads) is handled by multer, not these parsers.
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(csrfProtection);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server running successfully",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health/live", (req, res) => {
  res.status(200).json({ success: true, status: "live" });
});

app.get("/health/ready", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? "ready" : "not_ready",
    database: ready ? "connected" : "disconnected",
  });
});

// ─── API routes ────────────────────────────────────────────────────────────────
app.use("/api/admin", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/managers", managerRoutes);
app.use("/api/favorites", favoriteRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
// Catches any request that didn't match a defined route.
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// ─── Global error middleware — MUST be last ────────────────────────────────────
// Receives errors forwarded by next(err) from any middleware or controller.
app.use(errorHandler);

export default app;
