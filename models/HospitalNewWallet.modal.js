import mongoose from "mongoose";

const hospitalNewWalletSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalAppointment",
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    source: {
      type: String,
      enum: ["appointment", "payout", "adjustment"],
      required: true,
    },

    status: {
      type: String,
      enum: ["available", "paid"],
      default: "available",
    },

    note: {
      type: String,
    },
  },
  { timestamps: true }
);

const HospitalNewWallet = mongoose.model(
  "HospitalNewWallet",
  hospitalNewWalletSchema
);

export default HospitalNewWallet;