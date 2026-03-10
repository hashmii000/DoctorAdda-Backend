import mongoose from "mongoose";

const DiagnosticWalletSchema = new mongoose.Schema(
  {
    DiagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentType: {
      type: String,
      enum: ["credited", "settled", ],
      default: "credited",
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const DiagnosticWallet = mongoose.model("DiagnosticWallet", DiagnosticWalletSchema);

export default DiagnosticWallet;
