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
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [128, "Password must not exceed 128 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["superadmin", "manager"],
      default: "superadmin",
    },
    emailVerified: {
      type: Boolean,
      default: true,
    },
    // SECURITY FIX: refreshToken now stores ONLY a SHA-256 hash of the
    // refresh token (see auth.service.js). Field name is kept so existing
    // `.select("+refreshToken")` calls keep working. All existing
    // plaintext refresh tokens become invalid on deploy — admins must
    // log in again once. That is intentional.
    refreshToken: {
      type: String,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // SECURITY FIX: Incremented on logout, password change, password
    // reset and deactivation. verifyJWT rejects access tokens whose
    // tokenVersion does not match, so those events now revoke access
    // tokens immediately instead of leaving a 15-minute window.
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // SECURITY FIX: Per-account login lockout.
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true },
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const saltRounds = 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

adminSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

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
