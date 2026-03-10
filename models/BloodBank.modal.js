import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const BloodBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    walletPercentage: {
      type: Number,
      default: 0,
    },
    address: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    reviews: [ReviewSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    phone: {
      type: String,
      required: true,
    },
    profilepic: {
      type: String,
    },
    // hospital: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Hospital",
    // },
    description: {
      type: String,
      default: "Emergency BloodBank services for medical transportation.",
    },
    accountType: {
      type: String,
      enum: [
        "User",
        "Doctor",
        "Ambulance",
        "Pharmacy",
        "Hospital",
        "Diagnostic",
        "Veterinary",
        "BloodBank",
        "Admin",
      ],
      default: "BloodBank",
      required: true,
    },
    userId: {
      type: String,
    },
    isApprove: {
      type: String,
      enum: ["Approved", "Reject", "NotApprove"],
      default: "NotApprove",
      required: true,
    },
    availability: [
      {
        bloodGroup: {
          type: String,
          required: true,
        },
        amount: {
          type: String,
          required: true,
        },
        unitAvailability: {
          type: String,
          required: true,
        },
      },
    ],
     fcmToken: {
    type: String,
  },
  },
  { timestamps: true }
);

const BloodBank = mongoose.model("BloodBank", BloodBankSchema);

export default BloodBank;
