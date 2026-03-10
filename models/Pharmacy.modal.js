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

// medicin
const MedicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,  
    },
    discription: {
      type: String, 
    },
    status: {
      type: Boolean, 
    },
    price: {
      type: String, 
    },
  },
  { timestamps: true }
);

const PharmacySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    reviews: [ReviewSchema],
    medicine: [MedicineSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    storeTiming: {
      type: String,
    },
    services: [
      {
        name: {
          type: String,
        },
      },
    ],
    phone: {
      type: String,
      required: true,
    },
    
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "A healthcare institution providing medical treatment.",
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
    profileImages: [String],
    isApprove: {
      type: String,
      enum: ["Approved", "Reject", "NotApprove"],
      default: "NotApprove",
      required: true,
    },
  
    
    onlinePayment: {
      type: Boolean,
      default: true,
    },
    cod: {
      type: Boolean,
      default: true,
    },
    userId: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
    accountType: {
      type: String,
      enum: [
        "User",
        "Doctor",
        "Pharmacy",
        "Diagnostic",
        "Veterinary",
        "Ambulance",
        "Admin",
      ],
      default: "Pharmacy",
      required: true,
    },
  },
  { timestamps: true }
);

PharmacySchema.index({ location: "2dsphere" });

const Pharmacy = mongoose.model("Pharmacy", PharmacySchema);

export default Pharmacy;
