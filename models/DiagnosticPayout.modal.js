
import mongoose from "mongoose";

const diagnosticPayoutSchema = new mongoose.Schema(
  {
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
      required: true,
    },

    fromDate: Date,
    toDate: Date,

    totalAppointments: Number,
    payableAmount: Number,

    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    paidAt: Date,
    transactionRef: String,
  },
  { timestamps: true }
);

export default mongoose.model("DiagnosticPayout", diagnosticPayoutSchema);