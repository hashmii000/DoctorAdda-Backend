import mongoose from "mongoose";

const PaymentMethodSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentMethod = mongoose.model("PaymentMethod", PaymentMethodSchema);

export default PaymentMethod;
