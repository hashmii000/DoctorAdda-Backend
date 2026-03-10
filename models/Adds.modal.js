import mongoose from "mongoose";

const AddSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    bannerImage: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      //   required: true,
    },
  },
  { timestamps: true }
);

const Add = mongoose.model("Add", AddSchema);
export default Add;
