import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import Admin from "./models/admin.model.js";
import Car from "./models/car.model.js";
import {
  processPendingImageCleanup,
  reconcileUnreferencedImageKitFiles,
} from "./services/imageCleanup.service.js";
import ListingCreation from "./models/listingCreation.model.js";
import ImageCleanupTask from "./models/imageCleanupTask.model.js";

const PORT = process.env.PORT || 5000;

// SECURITY FIX: Environment validation now applies in every environment,
// not only production. Previously a production deployment without
// NODE_ENV=production silently skipped secret-length, secret-difference
// and HTTPS checks.
const validateEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV;
  if (!["production", "development", "test"].includes(nodeEnv)) {
    throw new Error(
      "NODE_ENV must be explicitly set to production, development, or test",
    );
  }

  const required = [
    "MONGODB_URI",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "IMAGEKIT_PUBLIC_KEY",
    "IMAGEKIT_PRIVATE_KEY",
    "IMAGEKIT_URL_ENDPOINT",
    "FRONTEND_URL",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // Secrets: always checked, not only in production.
  if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must differ");
  }
  if (
    process.env.ACCESS_TOKEN_SECRET.length < 32 ||
    process.env.REFRESH_TOKEN_SECRET.length < 32
  ) {
    throw new Error("JWT secrets must be at least 32 characters");
  }

  if (nodeEnv === "production") {
    if (process.env.FRONTEND_URL.startsWith("http://")) {
      throw new Error("FRONTEND_URL must use HTTPS in production");
    }
    // OTP_HASH_SECRET is required in production so OTP/reset hashes are
    // HMACs, not unsalted SHA-256. In development it falls back to SHA-256.
    if (!process.env.OTP_HASH_SECRET || process.env.OTP_HASH_SECRET.length < 32) {
      throw new Error("OTP_HASH_SECRET must be at least 32 characters in production");
    }
  }

  if (process.env.ADMIN_SETUP_TOKEN === "change-me") {
    throw new Error("ADMIN_SETUP_TOKEN must be changed from its placeholder value");
  }
  if (
    process.env.ADMIN_SETUP_TOKEN &&
    process.env.ADMIN_SETUP_TOKEN.length < 32
  ) {
    throw new Error("ADMIN_SETUP_TOKEN must be at least 32 characters");
  }
};

// Manager/Sub-Admin RBAC — legacy "admin" role migration, unchanged.
const migrateLegacyAdminRole = async () => {
  const result = await Admin.updateMany(
    { role: "admin" },
    { $set: { role: "superadmin" } },
  );
  if (result.modifiedCount > 0) {
    console.log(`Migrated ${result.modifiedCount} legacy admin(s) to "superadmin"`);
  }
};

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    await migrateLegacyAdminRole();
    await ListingCreation.createIndexes();
    await ImageCleanupTask.createIndexes();
    await Car.createIndexes();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment : ${process.env.NODE_ENV}`);
    });
    server.requestTimeout = 135_000;
    server.headersTimeout = 140_000;
    server.keepAliveTimeout = 65_000;

    const cleanupInterval = setInterval(() => {
      processPendingImageCleanup().catch((error) =>
        console.error("Image cleanup worker failed:", error.message),
      );
    }, 60_000);
    cleanupInterval.unref();
    processPendingImageCleanup().catch((error) =>
      console.error("Initial image cleanup worker failed:", error.message),
    );
    const reconciliationInterval = setInterval(
      () => {
        reconcileUnreferencedImageKitFiles().catch((error) =>
          console.error("Image reconciliation failed:", error.message),
        );
      },
      60 * 60 * 1000,
    );
    reconciliationInterval.unref();

    const shutdown = (signal) => {
      console.log(`${signal} received — shutting down gracefully...`);
      clearInterval(cleanupInterval);
      clearInterval(reconciliationInterval);
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
      setTimeout(() => {
        console.error("Forced exit after 30s timeout.");
        process.exit(1);
      }, 30_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection (server kept running):", reason);
    });
    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
      shutdown("uncaughtException");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
