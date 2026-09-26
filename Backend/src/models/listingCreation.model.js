import mongoose from "mongoose";

const listingCreationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      required: true,
      default: "processing",
      index: true,
    },
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },
    errorMessage: String,
    cleanupTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImageCleanupTask",
    },
    uploadedImages: {
      type: [
        {
          _id: false,
          url: { type: String, required: true },
          public_id: { type: String, required: true },
        },
      ],
      default: [],
    },
    attempts: {
      type: Number,
      default: 1,
    },
    leaseUntil: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true },
);

listingCreationSchema.index(
  { adminId: 1, idempotencyKey: 1 },
  { unique: true },
);

export default mongoose.model("ListingCreation", listingCreationSchema);
