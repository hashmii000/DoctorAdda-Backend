
import mongoose from "mongoose";

const platformEarningSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },

    providerType: {
      type: String,
      enum: ["Doctor", "Diagnostic", "Hospital"],
      required: true,
    },

    totalAmount: Number,
    platformFee: Number,
    doctorAmount: Number,
    diagnosticAmount: Number,
    hospitalAmount: Number,

    status: {
      type: String,
      enum: ["earned", "settled"],
      default: "earned",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformEarning", platformEarningSchema);