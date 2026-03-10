
import mongoose from "mongoose";

const diagnosticNewWalletSchema = new mongoose.Schema(
  {
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
      required: true,
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

export default mongoose.model("DiagnosticNewWallet", diagnosticNewWalletSchema);