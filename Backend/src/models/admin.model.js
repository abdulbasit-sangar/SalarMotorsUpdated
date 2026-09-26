import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must not exceed 30 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,           // always stored lowercase
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,             // never returned in queries by default
    },

    // NOTE — Manager/Sub-Admin RBAC: roles are now exactly "superadmin" and
    // "manager". Legacy documents created before this feature stored
    // role: "admin" (the old default); these are safely migrated to
    // "superadmin" on server startup (see server.js) so no admin ever loses
    // access. The role is always set by the backend (registerAdminService /
    // registerManagerService) — it is never accepted from client input.
    role: {
      type: String,
      enum: ["superadmin", "manager"],
      default: "superadmin",
    },

    // Manager/Sub-Admin RBAC: gates login until the manager has confirmed
    // ownership of their registered email via OTP. Defaults to true so the
    // existing superadmin (and any account created before this feature)
    // is completely unaffected. Only registerManagerService sets this false.
    emailVerified: {
      type: Boolean,
      default: true,
    },

    // Seller Information previously lived here (Admin.phone/location) and
    // was shown on every listing via Car.createdBy -> Admin. Moved to the
    // listing itself (Car.sellerPhone/sellerWhatsapp/sellerLocation — see
    // car.model.js) since one admin/manager account can list vehicles for
    // different sellers; keeping it per-account no longer made sense.
    // Removed here rather than left unused, per the dead-code cleanup pass.

    refreshToken: {
      type: String,
      select: false,             // never returned in queries by default
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,            // adds createdAt and updatedAt automatically
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// ─── Pre-save hook: hash password before saving ───────────────────────────────
// Only runs when the password field is actually modified (not on every save).
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const saltRounds = 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// ─── Instance method: compare plain password with hash ────────────────────────
adminSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  // `this.password` is not selected by default — caller must use .select("+password")
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance method: return safe public fields (no password, no refreshToken) ─
adminSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    emailVerified: this.emailVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
  };
};

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
