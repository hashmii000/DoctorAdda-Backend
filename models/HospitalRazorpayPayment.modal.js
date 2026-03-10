import mongoose from "mongoose";

const hospitalRazorpayPaymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalAppointment",
      required: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
    },

    razorpayPaymentId: String,
    razorpaySignature: String,

    amount: Number,
    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },

    capturedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model(
  "HospitalRazorpayPayment",
  hospitalRazorpayPaymentSchema
);