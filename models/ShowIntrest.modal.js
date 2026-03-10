import mongoose from "mongoose";

const ShowIntrestSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    hospitalJobPostingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalJobPosting",
    },
    status: {
      type: String,
      enum: ["DoctorInrest", "HospitalIntrest"],
      default: "DoctorInrest",
      required: true,
    },
  },
  { timestamps: true }
);

const ShowIntrest = mongoose.model("ShowIntrest", ShowIntrestSchema);

export default ShowIntrest;
