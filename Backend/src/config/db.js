import mongoose from "mongoose";

const connection = mongoose.connection;
let connectionPromise = null;
let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  connection.on("connected", () => {
    console.info("[DATABASE] Connection established.");
  });

  connection.on("disconnected", () => {
    console.warn("[DATABASE] Connection lost. The MongoDB driver will attempt recovery.");
  });

  connection.on("reconnected", () => {
    console.info("[DATABASE] Connection successfully restored.");
  });

  connection.on("error", (error) => {
    // Never print the URI or credentials; driver error messages are logged as-is.
    console.error("[DATABASE] Connection error:", error?.message || error);
  });

  connection.on("close", () => {
    console.warn("[DATABASE] Connection closed.");
  });
};

/**
 * Establish the application's single Mongoose connection.
 * Concurrent callers share the same in-flight attempt.
 */
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (connection.readyState === 1) return connection;
  if (connectionPromise) return connectionPromise;

  registerConnectionListeners();

  connectionPromise = mongoose
    .connect(process.env.MONGODB_URI, {
      // Let the driver manage recovery after transient network/Atlas events.
      // A finite selection timeout bounds failed operations during outages.
      serverSelectionTimeoutMS: 10_000,
      // Keep the driver's default socket timeout (0). A short inactivity
      // timeout can unnecessarily terminate otherwise healthy pooled sockets.
      maxPoolSize: 20,
      minPoolSize: 0,
      bufferCommands: false,
    })
    .then(() => {
      console.info("[DATABASE] Initial connection established.");
      return connection;
    })
    .catch((error) => {
      console.error("[DATABASE] Initial connection failed:", error?.message || error);
      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

export default connectDB;
