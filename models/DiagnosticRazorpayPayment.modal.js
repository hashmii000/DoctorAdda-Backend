import mongoose from "mongoose";

const diagnosticRazorpayPaymentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
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
  "DiagnosticRazorpayPayment",
  diagnosticRazorpayPaymentSchema
);