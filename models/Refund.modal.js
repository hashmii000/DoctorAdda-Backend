import mongoose from "mongoose";

const RefundSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    appointmentType: {
      type: String,
      enum: ["doctor", "hospital", "diagnostic", "pharmacy"],
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    paymentId: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    refundReason: {
      type: String,
      required: true,
      trim: true,
    },

    refundStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },

    refundMessage: {
      type: String,
      default: "",
    },

    refundDate: {
      type: Date,
    },

    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Refund = mongoose.model("Refund", RefundSchema);

export default Refund;
