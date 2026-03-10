import mongoose from "mongoose";

const RecentLocationSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const RecentLocationSearch = mongoose.model(
  "RecentLocationSearch",
  RecentLocationSearchSchema
);

export default RecentLocationSearch;
