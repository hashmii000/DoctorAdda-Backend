import mongoose from "mongoose";

const hospitalPayoutSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    fromDate: Date,
    toDate: Date,

    totalAppointments: Number,
    grossAmount: Number,
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

const HospitalPayout = mongoose.model("HospitalPayout", hospitalPayoutSchema);

export default HospitalPayout;