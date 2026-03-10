import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true, // yehi user ki unique id hogi
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);
