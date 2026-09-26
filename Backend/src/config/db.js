import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Root-cause fix for "backend becomes unresponsive after running a while":
//
// The previous config called `mongoose.connect(uri)` with no options at all.
// Two defaults made that dangerous in production:
//   1. `bufferCommands` defaults to `true` — if the connection to MongoDB
//      drops (Atlas idle disconnects, a network blip, a replica-set
//      failover) every query issued afterwards is silently queued in
//      memory instead of failing, waiting for a reconnect that may never
//      come. No error, no timeout — the request just hangs forever. That's
//      exactly "loads correctly at first, then stops responding."
//   2. No `serverSelectionTimeoutMS`/`socketTimeoutMS` meant even a genuine
//      reconnect attempt could hang indefinitely instead of failing fast.
//
// Fix: fail fast instead of hanging, and log connection state changes so a
// dropped connection is visible instead of silent.
// ─────────────────────────────────────────────────────────────────────────────

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000, // fail fast if Mongo can't be reached, instead of hanging
      socketTimeoutMS: 45_000,          // kill a socket that's gone quiet instead of holding it open forever
      maxPoolSize: 20,
      minPoolSize: 2,
      bufferCommands: false,            // never silently queue queries while disconnected — fail immediately
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }

  // ── Visibility into connection state after the initial connect ──────────
  // These don't crash the process — the Mongo driver already retries
  // reconnection on its own. This just makes drops/recoveries visible in
  // logs instead of silently degrading, and is what previously made this
  // bug near-impossible to diagnose.
  mongoose.connection.on("error", (err) => {
    console.error("⚠️  MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB disconnected — driver will attempt to reconnect.");
  });
  mongoose.connection.on("reconnected", () => {
    console.log("✅ MongoDB reconnected.");
  });
};

export default connectDB;
