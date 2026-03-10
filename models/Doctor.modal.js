import mongoose from "mongoose";

// Review Schema
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

const ClinicSchema = new mongoose.Schema({
  clinicName: {
    type: String,
    required: true,
  },

  clinicAddress: {
    type: String,
    required: true,
  },
  consultationFee: {
    type: Number,
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
  videoStartTime: {
    type: String,
  },
  videoEndTime: {
    type: String,
  },
  videoDuration: {
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
      type: [Number],
      required: true,
    },
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

  videoAvailability: [
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
});

// Doctor Schema
const DoctorSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    isSurgeon: {
      type: Boolean,
      default:false

    },
    onlineBooking: {
      type: Boolean,
      default:true

    },
    animalTreated:[String],

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
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    profileImages: [String],
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    accountType: {
      type: String,
      enum: ["User", "Doctor", "Admin"],
      default: "Doctor",
      required: true,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    goldMedalist: {
      type: Boolean,
      default: false,
    },
    hideNumber: {
      type: Boolean,
      default: false,
    },
    walletPercentage: {
      type: Number,
      default: 10,
    },
    dob: {
      type: Date,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    profilepic: {
      type: String,
    },
    experience: {
      type: String,
    },
    userId: {
      type: String,
    },
    about: {
      type: String,
    },
    education: {
      type: String,
    },
    documentNumber: {
      type: String,
    },
    documentImage: [String],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    userPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "accountType",
    },
    hospital: {
      type: String,
    },
    veterinaryDoctorType: {
      type: [String],
      enum: ["Small Animal", "Big Animal"],
      default: [],
    },
    serviceType: {
      type: [String],
      enum: ["In-clinic", "Video Consultation"],
      default: [],
    },
    veterinaryserviceType: {
      type: [String],
      enum: ["In-clinic", "Home Visit"],
      default: [],
    },

    isApprove: {
      type: String,
      enum: ["Approved", "Reject", "NotApprove"],
      default: "NotApprove",
      required: true,
    },
    isAvilable: {
      type: Boolean,
      default: false,
    },
    reviews: [ReviewSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    clinics: [ClinicSchema],
    fcmToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index for all clinic locations
DoctorSchema.index({ "clinics.location": "2dsphere" });

const Doctor = mongoose.model("Doctor", DoctorSchema);
export default Doctor;
