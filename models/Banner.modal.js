import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: [
        "Doctor",
        "Hospital",
        "Pharmacy",
        "Diagnostic",
        "Ambulance",
        "Other",
      ],
      required: true,
    },
    id: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Banner = mongoose.model("Banner", BannerSchema);

export default Banner;
