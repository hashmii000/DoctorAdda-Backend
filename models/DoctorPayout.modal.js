
import mongoose from "mongoose";

const doctorPayoutSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },

    fromDate: Date,
    toDate: Date,

    totalAppointments: Number,
    grossAmount: Number,
    platformFee: Number,
    payableAmount: Number,

    status: {
      type: String,
      enum: ["pending", "processing", "paid"],
      default: "pending",
    },

    paidAt: Date,
    transactionRef: String,
  },
  { timestamps: true }
);

export default mongoose.model("DoctorPayout", doctorPayoutSchema);