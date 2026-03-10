
import mongoose from "mongoose";

const doctorsNewWalletSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },

    amount: Number,

    type: {
      type: String,
      enum: ["credit", "debit"],
    },

    source: {
      type: String,
      enum: ["appointment", "payout"],
    },

    status: {
      type: String,
      enum: ["available", "paid"],
      default: "available",
    },

    note: String,
  },
  { timestamps: true }
);

const DoctorsNewWallet = mongoose.model("DoctorsNewWallet", doctorsNewWalletSchema);

export default DoctorsNewWallet;
