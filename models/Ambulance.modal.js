import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // assuming you have a User model
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

const AmbulanceVehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  gpsTraking: {
    type: Boolean,
    default: false,
  },
  documents: [
    {
      name: {
        type: String,
      },
      number: {
        type: String,
      },
      image: {
        type: String,
      },
    },
  ],

  vehicleNumber: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: String,
  },
  profileImages: [String],
  image: {
    type: String,
  },
  capacity: {
    type: String,
  },
  services: {
    type: [String], // e.g., ["Oxygen", "Stretcher", "Cardiac Monitor"]
    default: [],
  },
  description: {
    type: String,
    default: "Emergency ambulance vehicle.",
  },
});

const AmbulanceSchema = new mongoose.Schema(
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
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
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
    capacity: {
      type: String,
    },
    ambulanceVehicles: [AmbulanceVehicleSchema],
    reviews: [ReviewSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    price: {
      type: String,
    },
    description: {
      type: String,
      default: "Emergency ambulance services for medical transportation.",
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
      default: "Ambulance",
      required: true,
    },
    isApprove: {
      type: String,
      enum: ["Approved", "Reject", "NotApprove"],
      default: "NotApprove",
      required: true,
    },
    ambulanceType: {
      type: String,
    },
    profilepic: {
      type: String,
    },

    driverInfo: {
      name: {
        type: String,
        // required: true,
      },
      mobile: {
        type: String,
        // required: true,
      },
      licenseNumber: {
        type: String,
        // required: true,
      },
    },
    ownerDetails: {
      name: {
        type: String,
      },
      gstNumber: {
        type: String,
      },
      phoneNumber: {
        type: String,
      },
    },
    userId: {
      type: String,
    },

    availabilityStatus: {
      type: String,
      enum: ["Available", "Unavailable", "In Transit"],
      default: "Available",
      required: true,
    },
    operatingHours: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
    emergencyContact: {
      type: String,
    },
  },
  { timestamps: true }
);

AmbulanceSchema.index({ location: "2dsphere" });

const Ambulance = mongoose.model("Ambulance", AmbulanceSchema);

export default Ambulance;
