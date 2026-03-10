import mongoose from "mongoose";

const DoctorReferalSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    diagnostic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
    },
    referalId: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Pending", "Claimed", "Completed", "Cancelled"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const DoctorReferal = mongoose.model("DoctorReferal", DoctorReferalSchema);

export default DoctorReferal;
