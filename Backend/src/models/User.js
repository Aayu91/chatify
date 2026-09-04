import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },

    // Add inside userSchema:
friends: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],
friendRequests: [
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
  },
],
  },
  
  { timestamps: true } // createdAt & updatedAt
);

// ✅ After — checks if model already exists before creating it
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;