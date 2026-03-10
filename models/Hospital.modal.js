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

// Main Hospital schema
const HospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNo: {
      type: String,
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

    wallet: {
      type: Number,
      default: 0,
    },
    walletPercentage: {
      type: Number,
      default: 10,
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
    facilities: [
      {
        name: {
          type: String,
        },
        discription: {
          type: String,
        },
      },
    ],
    profileImages: [String],
    doctors: [
      {
        name: {
          type: String,
        },
        experience: {
          type: String,
        },
        specialization: {
          type: String,
        },
        fee: {
          type: String,
        },
        status: {
          type: String,
        },
        email: {
          type: String,
        },
        phone: {
          type: String,
        },
        days: {
          type: [String],
        },

        availability: [
          {
            date: {
              type: Date,
              // required: true,
            },
            isAvailable: {
              type: Boolean,
              // default: true,
            },
            slots: [
              {
                startTime: {
                  type: String,
                  // required: true,
                },
                endTime: {
                  type: String,
                  // required: true,
                },

                isBooked: {
                  type: Boolean,
                  default: false,
                },
              },
            ],
          },
        ],

        schedules: [
          {
            shift: {
              type: String,
              default: "Morning",
            },
            startTime: { type: String },
            endTime: { type: String },
          },
        ],
      },
    ],
    registeredDoctor: [
      {
        doctorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Doctor",
        },
        days: {
          type: [String],
        },
        availability: [
          {
            date: {
              type: Date,
              // required: true,
            },
            isAvailable: {
              type: Boolean,
              // default: true,
            },
            slots: [
              {
                startTime: {
                  type: String,
                  // required: true,
                },
                endTime: {
                  type: String,
                  // required: true,
                },

                isBooked: {
                  type: Boolean,
                  default: false,
                },
              },
            ],
          },
        ],
        fee: {
          type: String,
        },
        status: {
          type: String,
        },
        schedules: [
          {
            shift: {
              type: String,
              default: "Morning",
            },
            startTime: {
              type: String,
            },
            endTime: {
              type: String,
            },
          },
        ],
      },
    ],
    reviews: [ReviewSchema],
    averageRating: {
      type: Number,
      default: 0,
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
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    healthCard: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HealthCard",
      },
    ],
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
      default: "Hospital",
      required: true,
    },

    hospitalType: {
      type: String,
      enum: ["Private", "Government", "Charitable", "Other"],
      default: "Private",
      required: true,
    },

    yearOfEstablish: {
      type: String,
    },

    isApprove: {
      type: String,
      enum: ["Approved", "Reject", "NotApprove"],
      default: "NotApprove",
      required: true,
    },
    userId: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
    s2CellId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

HospitalSchema.index({ location: "2dsphere" });

const Hospital = mongoose.model("Hospital", HospitalSchema);

export default Hospital;
