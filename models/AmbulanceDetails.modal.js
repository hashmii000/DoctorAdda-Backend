import mongoose from "mongoose";

const AmbulanceDetailsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    AmbulanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ambulance",
      required: true,
    },
    kms: [
      {
        km: { type: String },
        price: { type: String },
      },
    ],

    perKmPriceAfterMax: {
      type: Number,
      default: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const AmbulanceDetails = mongoose.model(
  "AmbulanceDetails",
  AmbulanceDetailsSchema
);

export default AmbulanceDetails;
