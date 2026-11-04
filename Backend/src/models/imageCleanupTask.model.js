import mongoose from "mongoose";

const cleanupImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { _id: false },
);

const imageCleanupTaskSchema = new mongoose.Schema(
  {
    operationKey: { type: String, required: true, unique: true },
    operation: {
      type: String,
      enum: ["upload_rollback", "listing_delete", "image_delete"],
      required: true,
    },
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },
    images: { type: [cleanupImageSchema], required: true },
    imagePublicId: String,
    // Multi-instance task ownership. A worker claims a task by setting
    // claimedBy + leaseUntil atomically; the lease expires so crashed
    // workers' tasks become reclaimable. Every terminal state transition
    // is guarded on (claimedBy, status) so a stale worker can never
    // modify a task it no longer owns.
    claimedBy: { type: String, default: null, index: true },
    leaseUntil: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "exhausted"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lastError: String,
  },
  { timestamps: true },
);

imageCleanupTaskSchema.index({ status: 1, nextAttemptAt: 1 });
imageCleanupTaskSchema.index({ leaseUntil: 1 });

export default mongoose.model("ImageCleanupTask", imageCleanupTaskSchema);
