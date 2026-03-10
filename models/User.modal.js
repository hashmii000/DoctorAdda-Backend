import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      // required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
    },
    isNew: {
      type: Boolean,
      default: true,
      required: true,
    },
    otpExpiration: {
      type: Date,
      required: true,
    },
    name: {
      type: String,
    },
    gender: {
      type: String,
    },
    accountType: {
      type: String,
      enum: [
        "User",
        "Doctor",
        "Pharmacy",
        "Hospital",
        "Diagnostic",
        "Veterinary",
        "Ambulance",
        "Admin",
      ],
      default: "User",
      required: true,
    },
    dob: {
      type: Date,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    bloodType: {
      type: String,
    },
    allergies: {
      type: String,
    },
    currentMedic: {
      type: String,
    },
    pastMedic: {
      type: String,
    },
    ChronicDisease: {
      type: String,
    },
    injuries: {
      type: String,
    },
    profilepic: {
      type: String,
    },
    consumeSmoke: {
      type: String,
    },
    consumeAlcohol: {
      type: String,
    },
    activityLevel: {
      type: String,
    },
    orderAddress: [
      {
        type: { type: String },
        name: { type: String },
        phone: { type: String },
        address: { type: String },
        area: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        landmark: { type: String },
        country: { type: String },
        isDefault: { type: Boolean, default: false },
      },
    ],
    members: [
      {
        profile: { type: String },
        name: { type: String },
        age: { type: String },
        email: { type: String, trim: true, lowercase: true },
        gender: { type: String, enum: ["Male", "Female", "Other"] },
      },
    ],
    pets: [
      {
        profile: { type: String },
        name: { type: String },
        age: {
          month: { type: Number, default: 0 },
          year: { type: Number, default: 0 },
        },
        breed: { type: String },
        weight: { type: String },
        gender: { type: String, enum: ["Male", "Female", "Other"] },
        type: { type: String },
      },
    ],
    foodPreferd: {
      type: String,
    },
    occupation: {
      type: String,
    },
    address: {
      type: String,
    },
    upgradeAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "accountType",
    },
    upgradeAccountType: {
      type: String,
    },
    upgradeAccountApproveStatus: {
      type: Boolean,
      default: false,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
    password: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
    authToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if password matches
UserSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate JWT token without expiration (infinite lifetime)
UserSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { userId: this._id, accountType: this.accountType },
    process.env.JWT_SECRET
  );
  return token;
};

const User = mongoose.model("User", UserSchema);

export default User;
