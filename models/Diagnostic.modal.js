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
const bloodBankSchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
    },
    prbc: {
      type: String,
    },
    ffp: {
      type: String,
    },
    rdp: {
      type: String,
    },
    wp: {
      type: String,
    },
    platelets: {
      type: String,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const DiagnosticSchema = new mongoose.Schema(
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
    homeCollection: {
      type: Boolean,
      default: 0,
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
    walletPercentage: {
      type: Number,
      default: 10,
    },
    address: {
      type: String,
    },
    profileImages: [String],
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
    bloodBank: [bloodBankSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    storeTiming: {
      type: String,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    duration: {
      type: String,
    },
    availability: [
      {
        date: {
          type: Date,
          required: true,
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
        slots: [
          {
            startTime: {
              type: String,
              required: true,
            },
            endTime: {
              type: String,
              required: true,
            },

            isBooked: {
              type: Boolean,
              default: false,
            },
          },
        ],
      },
    ],
    services: [
      {
        name: {
          type: String,
        },
        price: {
          type: String,
        },
      },
    ],
    packages: [
      {
        name: {
          type: String,
        },
        price: {
          type: String,
        },
        details: {
          type: String,
        },
      },
    ],
    phone: {
      type: String,
      required: true,
    },
    isBloodBank: {
      type: Boolean,
      default: false,
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
    userId: {
      type: String,
    },

    isApprove: {
      type: String,
      enum: ["Approved", "Reject", "NotApprove"],
      default: "NotApprove",
      required: true,
    },

    accountType: {
      type: String,
      enum: [
        "User",
        "Doctor",
        "Diagnostic",
        "Diagnostic",
        "Veterinary",
        "Ambulance",
        "Admin",
      ],
      default: "Diagnostic",
      required: true,
    },
    fcmToken: {
      type: String,
    },
  },
  { timestamps: true }
);

DiagnosticSchema.index({ location: "2dsphere" });

const Diagnostic = mongoose.model("Diagnostic", DiagnosticSchema);

export default Diagnostic;
