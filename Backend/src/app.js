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

// SECURITY FIX: Trust proxy must be explicit, never assumed.
// Set TRUST_PROXY=1 on Render/Railway (one proxy hop) and TRUST_PROXY=0
// when running directly. Default is 0 (fail closed) so a client cannot
// spoof X-Forwarded-For to bypass IP rate limits.
const trustProxy = process.env.TRUST_PROXY
  ? Number(process.env.TRUST_PROXY)
  : 0;
if (Number.isFinite(trustProxy) && trustProxy >= 0) {
  app.set("trust proxy", trustProxy);
}

// 1. Helmet — security headers.
app.use(helmet());

// 2. Global rate limiter — 100 req / 15min per IP in production.
app.use(globalLimiter);

// 3. CORS — single configured origin only. In production there is no
// localhost fallback: server.js already requires FRONTEND_URL, and this
// guard protects standalone use of app.js (tests, another entry point).
const frontendUrl = process.env.FRONTEND_URL;
const corsOrigin =
  frontendUrl || process.env.NODE_ENV === "production"
    ? frontendUrl
    : "http://localhost:3000";
app.use(
  cors({
    origin: corsOrigin || false,
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

// Body parsers — BEFORE mongoSanitize (security fix).
// Previously mongoSanitize ran before express.json(), so JSON bodies
// were never sanitized. Query and params were covered, JSON was not.
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// 4. MongoDB sanitizer — now runs after parsing, so req.body is covered.
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `Sanitized field: ${key} in ${req.method} ${req.path}`,
        );
      }
    },
  }),
);

app.use(csrfProtection);

// Health checks — no environment or database detail is disclosed.
app.get("/", (req, res) => {
  res.json({ success: true, message: "Server running successfully" });
});

app.get("/health/live", (req, res) => {
  res.status(200).json({ success: true, status: "live" });
});

app.get("/health/ready", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? "ready" : "not_ready",
  });
});

// API routes
app.use("/api/admin", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/managers", managerRoutes);
app.use("/api/favorites", favoriteRoutes);

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

// Global error middleware — MUST be last
app.use(errorHandler);

export default app;
