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

const validateEnvironment = () => {
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
  if (process.env.NODE_ENV === "production") {
    if (process.env.FRONTEND_URL.startsWith("http://")) {
      throw new Error("FRONTEND_URL must use HTTPS in production");
    }
    if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
      throw new Error(
        "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must differ",
      );
    }
    if (
      process.env.ACCESS_TOKEN_SECRET.length < 32 ||
      process.env.REFRESH_TOKEN_SECRET.length < 32
    ) {
      throw new Error("JWT secrets must be at least 32 characters");
    }
  }
  if (process.env.ADMIN_SETUP_TOKEN === "change-me") {
    throw new Error(
      "ADMIN_SETUP_TOKEN must be changed from its placeholder value",
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Manager/Sub-Admin RBAC — one-time, idempotent, backward-compatible migration.
//
// Before this feature, Admin.role could only ever be "admin" (the schema's
// old default). The new role enum is ["superadmin", "manager"], so any
// legacy "admin" record is safely promoted to "superadmin" — this is the
// existing main admin, so it must keep full access. Running this on every
// boot is safe: once no "admin"-role documents remain, it's a no-op.
// No data is deleted, no passwords are touched, no new accounts are created.
// ─────────────────────────────────────────────────────────────────────────────
const migrateLegacyAdminRole = async () => {
  const result = await Admin.updateMany(
    { role: "admin" },
    { $set: { role: "superadmin" } },
  );
  if (result.modifiedCount > 0) {
    console.log(
      `✅ Migrated ${result.modifiedCount} legacy admin(s) to role "superadmin"`,
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 22 — PRODUCTION SERVER BOOT
//
// Pattern: connect DB first → if it fails, exit immediately.
// Never start accepting HTTP requests with a broken DB connection.
// ─────────────────────────────────────────────────────────────────────────────

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();
    await migrateLegacyAdminRole();
    await ListingCreation.createIndexes();
    await ImageCleanupTask.createIndexes();
    await Car.createIndexes();

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📦 Environment : ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 URL         : http://localhost:${PORT}\n`);
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

    // ── Graceful shutdown ──────────────────────────────────────────────────
    // On SIGTERM (e.g. Render/Railway stopping the dyno), finish in-flight
    // requests before closing. Prevents broken responses mid-request.
    const shutdown = (signal) => {
      console.log(`\n🛑 ${signal} received — shutting down gracefully...`);
      clearInterval(cleanupInterval);
      clearInterval(reconciliationInterval);
      server.close(() => {
        console.log("✅ HTTP server closed.");
        process.exit(0);
      });

      // Allow long-running ImageKit operations to finish during deployment.
      setTimeout(() => {
        console.error("⚠️  Forced exit after 30s timeout.");
        process.exit(1);
      }, 30_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C in dev

    // ── Unhandled promise rejections ───────────────────────────────────────
    // This used to call server.close() + process.exit(1) here — meaning
    // ANY unhandled rejection anywhere in the process (not just a request)
    // took the entire server down permanently, with no process manager to
    // bring it back — matching exactly the "needs to be restarted
    // manually" symptom. Every request path already goes through
    // asyncHandler (see utils/apiHelpers.js), which forwards real request
    // errors to the Express error middleware and sends a proper response —
    // so a rejection reaching this top-level handler is, by construction,
    // NOT an in-flight request failing to respond. Killing the whole
    // server for it is the bug, not a safety net. Log it loudly and keep
    // serving traffic.
    process.on("unhandledRejection", (reason) => {
      console.error("❌ Unhandled Rejection (server kept running):", reason);
    });

    // ── Uncaught synchronous exceptions ────────────────────────────────────
    // There was previously no handler for this at all — Node's default
    // behavior is to crash immediately with no application-level logging,
    // which is indistinguishable from "the server just stopped" unless
    // you already had the terminal open. A synchronous throw outside any
    // request (e.g. in a timer callback) can leave process state
    // inconsistent, so this still exits — but now it logs first, and exits
    // deliberately via the same graceful-shutdown path instead of an
    // abrupt kill, so in-flight requests get a chance to finish.
    process.on("uncaughtException", (err) => {
      console.error("❌ Uncaught Exception:", err);
      shutdown("uncaughtException");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
