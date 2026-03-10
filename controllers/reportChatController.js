import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiResponse } from "../utils/apiResponse.js";

const GEMINI_API_KEY = `AIzaSyDIo-ZDuVZCOROkP3Dtn6PQ74F3ovP5knU`;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const MODEL_NAME = "gemini-3-flash-preview";

export const uploadReport = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "imageUrl is required"));
    }

    // 🔽 Download image from Cloudinary
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    const imageBase64 = Buffer.from(imageResponse.data).toString("base64");

    // 🧠 Gemini Vision Model
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
    });

    const prompt = `
You are a medical report explanation assistant.

Rules:
- DO NOT diagnose diseases.
- DO NOT prescribe medicines.
- Explain results in simple language.
- Clearly say if values appear normal or abnormal.
- Give general health advice only.
- End with: "Please consult a qualified doctor for medical advice."
- Reply in English.

Analyze the uploaded medical report image carefully.
`;

    const result = await model.generateContent([
      {
        text: prompt,
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
    ]);

    const answer = result.response.text();

    return res.status(200).json(
      new apiResponse(
        200,
        {
          explanation: answer,
          imageUrl,
          disclaimer:
            "This information is for educational purposes only and not a medical diagnosis.",
        },
        "Report analyzed successfully"
      )
    );
  } catch (error) {
    console.error("Report analysis error:", error.message);
    return res
      .status(500)
      .json(new apiResponse(500, null, "Report analysis failed"));
  }
};