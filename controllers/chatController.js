// // ==========================================

// import { apiResponse } from "../utils/apiResponse.js";
// import { asyncHandler } from "../utils/asynchandler.js";
// import axios from "axios";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import fs from "fs";
// import path from "path";
// const apiKey = `AIzaSyDIo-ZDuVZCOROkP3Dtn6PQ74F3ovP5knU`;
// // const apiKey = `AIzaSyAg7irAWhIFq04mKyXnUqWds_H6wLFuDuc`;
// const genAI = new GoogleGenerativeAI(apiKey);

// // In-memory session storage
// const sessions = new Map();

// const categories = [
//   "General Physician",
//   "Skin & Hairs",
//   "Dental Care",
//   "Child Specialist",
//   "Ear,Nose,Throat",
//   "Veterinary",
//   "Cardiologist (Heart)",
//   "Neurologist (Brain)",
//   "Orthopedic (Bone & Joint)",
//   "Gynecologist (Women's Health)",
//   "Urologist (Kidney & Urinary)",
//   "Gastroenterologist (Stomach)",
//   "Oncologist (Cancer)",
//   "Lungs & Chest",
//   "Eyes & Vision",
//   "Blood & Immunity",
//   "Hormones & Metabolism",
//   "Infections",
//   "Emergency & Critical Care",
//   "Rehabilitation & Others",
//   "AYUSH(Alternative Medicine)",
// ];

// // File to store categories
// const CATEGORY_FILE = path.join(process.cwd(), "categoryHistory.json");

// // Helper to save category to file
// function saveCategoryToFile(sessionId, category) {
//   let fileData = {};
//   if (fs.existsSync(CATEGORY_FILE)) {
//     const raw = fs.readFileSync(CATEGORY_FILE, "utf-8");
//     try {
//       fileData = JSON.parse(raw);
//     } catch (err) {
//       console.error("JSON parse error:", err);
//     }
//   }
//   fileData[sessionId] = category;
//   fs.writeFileSync(CATEGORY_FILE, JSON.stringify(fileData, null, 2), "utf-8");
// }

// function getCategoryFromFile(sessionId) {
//   if (!fs.existsSync(CATEGORY_FILE)) return null;
//   try {
//     const raw = fs.readFileSync(CATEGORY_FILE, "utf-8");
//     const fileData = JSON.parse(raw);
//     return fileData[sessionId] || null;
//   } catch (err) {
//     console.error("JSON parse error:", err);
//     return null;
//   }
// }

// const chat = asyncHandler(async (req, res) => {
//   const { question, sessionId, longitude, latitude } = req.body;

//   if (!question) {
//     return res
//       .status(400)
//       .json(new apiResponse(400, null, "Question is required"));
//   }

//   const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
//   let history = sessions.get(sessionId) || [];

//   // Step 1: Generate AI answer
//   const answerPrompt = `
// You are "DoctorsAdda Health Assistant", an intelligent medical chatbot.

// Rules:
// - Detect if question is in Hindi or English; reply in same language.
// - If it's a health problem (headache, fever, stomach pain, etc):
//   1. Explain briefly possible causes (2–3 sentences).
//   2. Suggest 2–3 easy home remedies or exercises.
//   3. End with:
//      Hindi: "लेकिन अगर समस्या बनी रहती है, तो डॉक्टर को दिखाना ज़रूरी है। क्या मैं आपके आस-पास कुछ डॉक्टर सुझाऊँ?"
//      English: "However, if the problem continues, you should consult a doctor. Would you like me to suggest nearby doctors?"
// - If greeting (hi, hello, namaste):
//   → Greet warmly and ask about health concerns.
// - If non-medical (sports, politics, etc):
//   → Reply: "This service only answers health or medical-related questions."

// Past conversation:
// ${history.join("\n")}

// User Question:
// ${question}
// `;

//   try {
//     const result = await model.generateContent(answerPrompt);
//     let answer = result.response.text();

//     // Update session history
//     history.push(`User: ${question}`);
//     history.push(`AI: ${answer}`);
//     sessions.set(sessionId, history);

//     // Step 2: Classify into category
//     const categoryPrompt = `
// You are a medical assistant AI.
// Analyze the following user question and AI answer.
// Pick **only one single most relevant category** from this list:

// ${categories.join(", ")}

// Question: "${question}"
// Answer: "${answer}"

// Respond ONLY with the category name, nothing else.
// `;

//     const classificationResult = await model.generateContent(categoryPrompt);
//     let session = sessions.get(sessionId) || { history: [], category: null };
//     const categoryName1 = session.category;

//     console.log("categoryName1", categoryName1);
//     const categoryName = classificationResult.response.text().trim();

//     // Step 3: Check if user wants doctor suggestions
//     let responseData = {};
//     const lowerQ = question.toLowerCase();
//     if (
//       lowerQ.includes("doctor suggest") ||
//       lowerQ.includes("suggest doctor") ||
//       lowerQ.includes("doctor list") ||
//       lowerQ.includes("yes") ||
//       lowerQ.includes("ok") ||
//       lowerQ.includes("haan")
//     ) {
//       // const params = {
//       //   longitude,
//       //   latitude,
//       //   query: getCategoryFromFile(sessionId),
//       // };
//       // const response = await axios.get(
//       //   `http://localhost:${process.env.PORT || 5000}/api/global-search`,
//       //   { params }
//       // );

//       const params1 = {
//         isPagination: false,
//       };
//       const CategoryResponse = await axios.get(
//         `http://localhost:${
//           process.env.PORT || 5000
//         }/api/category?isPagination=false`
//       );

//       const categoryName = getCategoryFromFile(sessionId);
//       // const categoryName = "Eyes & Vision";

//       const categories = CategoryResponse?.data?.data || [];

//       console.log("categories", categories);

//       const filteredCategory = categories.filter(
//         (cat) => cat.name == categoryName
//       );
//       console.log("Filtered Categories:", filteredCategory[0]?._id);

//       const params = {
//         longitude,
//         latitude,
//         category: filteredCategory[0]?._id,
//       };
//       const response = await axios.get(
//         `http://localhost:${process.env.PORT || 5000}/api/doctor/doctors`,
//         { params }
//       );

//       const searchData = response?.data?.data || {};
//       responseData = {
//         doctors: searchData.doctors?.slice(0, 5) || [],
//       };

//       answer =
//         "Here are some nearby doctors you can consider consulting for proper medical advice.";
//     }

//     if (
//       lowerQ.includes("doctor suggest") ||
//       lowerQ.includes("suggest doctor") ||
//       lowerQ.includes("doctor list") ||
//       lowerQ.includes("yes") ||
//       lowerQ.includes("ok") ||
//       lowerQ.includes("haan")
//     ) {
//       console.log("lowerQ", lowerQ);
//     } else {
//       saveCategoryToFile(sessionId, categoryName);
//     }

//     const data = { answer, category: categoryName, responseData };
//     res
//       .status(201)
//       .json(new apiResponse(201, data, "Answer created successfully"));
//   } catch (error) {
//     console.error("Gemini API error:", error.response?.data || error.message);
//     res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
//   }
// });

// export { chat };

// ==========================================
// DoctorAdda Health Assistant - Smart Chatbot
// ==========================================

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { ChatHistory } from "../models/ChatHistory.modal.js"; // 🧠 new model

// =================== AI Config ===================
// const apiKey = `AIzaSyAg7irAWhIFq04mKyXnUqWds_H6wLFuDuc`;
const apiKey = `AIzaSyDIo-ZDuVZCOROkP3Dtn6PQ74F3ovP5knU`;
const genAI = new GoogleGenerativeAI(apiKey);

// =================== Session Storage ===================
const sessions = new Map();

const categories = [
  "General Physician",
  "Skin & Hairs",
  "Dental Care",
  "Child Specialist",
  "Ear,Nose,Throat",
  "Veterinary",
  "Cardiologist (Heart)",
  "Neurologist (Brain)",
  "Orthopedic (Bone & Joint)",
  "Gynecologist (Women's Health)",
  "Urologist (Kidney & Urinary)",
  "Gastroenterologist (Stomach)",
  "Oncologist (Cancer)",
  "Lungs & Chest",
  "Eyes & Vision",
  "Blood & Immunity",
  "Hormones & Metabolism",
  "Infections",
  "Emergency & Critical Care",
  "Rehabilitation & Others",
  "AYUSH(Alternative Medicine)",
];

// =================== Category Memory File ===================
const CATEGORY_FILE = path.join(process.cwd(), "categoryHistory.json");

function saveCategoryToFile(sessionId, category) {
  let fileData = {};
  if (fs.existsSync(CATEGORY_FILE)) {
    const raw = fs.readFileSync(CATEGORY_FILE, "utf-8");
    try {
      fileData = JSON.parse(raw);
    } catch (err) {
      console.error("JSON parse error:", err);
    }
  }
  fileData[sessionId] = category;
  fs.writeFileSync(CATEGORY_FILE, JSON.stringify(fileData, null, 2), "utf-8");
}

function getCategoryFromFile(sessionId) {
  if (!fs.existsSync(CATEGORY_FILE)) return null;
  try {
    const raw = fs.readFileSync(CATEGORY_FILE, "utf-8");
    const fileData = JSON.parse(raw);
    return fileData[sessionId] || null;
  } catch (err) {
    console.error("JSON parse error:", err);
    return null;
  }
}

// =================== Main Chat Function ===================
const chat = asyncHandler(async (req, res) => {
 // const { question, sessionId, longitude, latitude } = req.body;

 const { question, sessionId, longitude, latitude, imageUrl } = req.body;

  // if (!question) {
  //   return res
  //     .status(400)
  //     .json(new apiResponse(400, null, "Question is required"));
  // }

  if (!question && !imageUrl) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Question or image is required"));
  }

  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  // 🧠 Fetch last 5 previous chats from DB
  const previousChats = await ChatHistory.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(5);

  const pastConversation = previousChats
    .reverse()
    .map((c) => `User: ${c.question}\nAI: ${c.answer}`)
    .join("\n");

    let reportExplanation = null;

if (imageUrl) {
  const reportResponse = await axios.post(`http://localhost:${
          process.env.PORT || 5000
        }/api/chat/upload-report`,
    { imageUrl }
  );

  reportExplanation = reportResponse?.data?.data?.explanation || null;
}

let answerPrompt = "";

if (reportExplanation && question) {
  // Image + Chat
  answerPrompt = `
User uploaded a medical report.

Report Explanation:
${reportExplanation}

User Question:
${question}

You are "DoctorsAdda Health Assistant", an intelligent medical chatbot.

Rules:
- Detect if the question is in Hindi or English; reply in same language.
- Use user's previous conversation to understand context or repeating symptoms.
- If symptoms are repeated, mention that politely ("You mentioned this earlier too...").
- If it's a health problem (headache, fever, stomach pain, health problem, etc):
  1. Explain briefly possible causes (2–3 sentences).
  2. Suggest 2–3 easy home remedies or exercises.
  3. End with:
     Hindi: "लेकिन अगर समस्या बनी रहती है, तो डॉक्टर को दिखाना ज़रूरी है। क्या मैं आपके आस-पास कुछ डॉक्टर सुझाऊँ? (type yes / haan / ok)"
     English: "However, if the problem continues, you should consult a doctor. Would you like me to suggest nearby doctors? (type yes / haan / ok)"
- If greeting (hi, hello, namaste): greet warmly and ask about health concerns.
- If non-medical (sports, politics, etc): reply "This service only answers health or medical-related questions."
`;
} 
else if (reportExplanation) {
  // Only Image
  answerPrompt = reportExplanation;
} 
else {
  // Only Chat (your existing logic)
  answerPrompt = `
You are "DoctorsAdda Health Assistant", an intelligent medical chatbot.

Rules:
- Detect if the question is in Hindi or English; reply in same language.
- Use user's previous conversation to understand context or repeating symptoms.
- If symptoms are repeated, mention that politely ("You mentioned this earlier too...").
- If it's a health problem (headache, fever, stomach pain, health problem, etc):
  1. Explain briefly possible causes (2–3 sentences).
  2. Suggest 2–3 easy home remedies or exercises.
  3. End with:
     Hindi: "लेकिन अगर समस्या बनी रहती है, तो डॉक्टर को दिखाना ज़रूरी है। क्या मैं आपके आस-पास कुछ डॉक्टर सुझाऊँ? (type yes / haan / ok)"
     English: "However, if the problem continues, you should consult a doctor. Would you like me to suggest nearby doctors? (type yes / haan / ok)"
- If greeting (hi, hello, namaste): greet warmly and ask about health concerns.
- If non-medical (sports, politics, etc): reply "This service only answers health or medical-related questions."

User’s previous conversation:
${pastConversation || "No previous chat."}

Current Question:
${question}
`;
}

//   const answerPrompt = `
// You are "DoctorsAdda Health Assistant", an intelligent medical chatbot.

// Rules:
// - Detect if the question is in Hindi or English; reply in same language.
// - Use user's previous conversation to understand context or repeating symptoms.
// - If symptoms are repeated, mention that politely ("You mentioned this earlier too...").
// - If it's a health problem (headache, fever, stomach pain, etc):
//   1. Explain briefly possible causes (2–3 sentences).
//   2. Suggest 2–3 easy home remedies or exercises.
//   3. End with:
//      Hindi: "लेकिन अगर समस्या बनी रहती है, तो डॉक्टर को दिखाना ज़रूरी है। क्या मैं आपके आस-पास कुछ डॉक्टर सुझाऊँ? (type yes / haan / ok)"
//      English: "However, if the problem continues, you should consult a doctor. Would you like me to suggest nearby doctors? (type yes / haan / ok)"
// - If greeting (hi, hello, namaste): greet warmly and ask about health concerns.
// - If non-medical (sports, politics, etc): reply "This service only answers health or medical-related questions."

// User’s previous conversation:
// ${pastConversation || "No previous chat."}

// Current Question:
// ${question}
// `;

  try {
    const result = await model.generateContent(answerPrompt);
    let answer = result.response.text();

    // Save to in-memory session also
    let history = sessions.get(sessionId) || [];
    history.push(`User: ${question}`);
    history.push(`AI: ${answer}`);
    sessions.set(sessionId, history);

    const categoryPrompt = `
You are a medical assistant AI.
Analyze the user question and AI answer below.
Select only ONE best-fitting category from this list:
${categories.join(", ")}

Question: "${question}"
Answer: "${answer}"

Respond with the category name only.
`;

    const classificationResult = await model.generateContent(categoryPrompt);
    const categoryName = classificationResult.response.text().trim();

    let responseData = {};
    const lowerQ = question.toLowerCase();

    console.log("lowerQ", lowerQ);

    if (
      lowerQ.includes("near me doctors list") ||
      lowerQ.includes("near me doctors") ||
      lowerQ.includes("near by doctors") ||
      lowerQ.includes("near doctors") ||
      lowerQ.includes("doctor batao") ||
      lowerQ.includes("doctors list") ||
      lowerQ.includes("doctor suggest") ||
      lowerQ.includes("doctor batao suggest") ||
      lowerQ.includes("suggest doctor") ||
      lowerQ.includes("doctor list") ||
      lowerQ.includes("yes") ||
      lowerQ.includes("ok") ||
      lowerQ.includes("haan")
    ) {
      const CategoryResponse = await axios.get(
        `http://localhost:${
          process.env.PORT || 5000
        }/api/category?isPagination=false`
      );

      const categoriesData = CategoryResponse?.data?.data || [];
      const savedCategory = getCategoryFromFile(sessionId);

      let filteredCategory = null;

      if (savedCategory === "Rehabilitation & Others") {
        filteredCategory = categoriesData.find(
          (cat) => cat.name === "General Physician"
        );
      } else {
        filteredCategory = categoriesData.find(
          (cat) => cat.name === savedCategory
        );
      }

      const params = {
        longitude,
        latitude,
        category: filteredCategory?._id,
      };

      const doctorResponse = await axios.get(
        `http://localhost:${process.env.PORT || 5000}/api/doctor/doctors`,
        { params }
      );

      console.log("doctorResponse", doctorResponse);

      const searchData = doctorResponse?.data?.data || {};
      const doctors = searchData.doctors?.slice(0, 5) || [];

      if (doctors.length === 0) {
        answer = `क्षमा करें, इस श्रेणी के लिए आपके आस-पास कोई डॉक्टर उपलब्ध नहीं हैं। कृपया बाद में पुनः प्रयास करें।`;
        // English fallback message:
        if (!/[^\u0000-\u007F]/.test(question)) {
          answer = `Sorry, there are currently no doctors available near your location for this category. Please try again later.`;
        }
      } else {
        answer =
          "Here are some nearby doctors you can consider consulting for proper medical advice.";
      }

      responseData = { doctors };
    } else {
      saveCategoryToFile(sessionId, categoryName);
    }

    await ChatHistory.create({
      sessionId,
      question,
      answer,
      category: categoryName,
    });
    // await ChatHistory.deleteMany({
    //   sessionId,
    //   _id: {
    //     $in: (
    //       await ChatHistory.find({ sessionId })
    //         .sort({ createdAt: -1 })
    //         .skip(10)
    //         .select("_id")
    //     ).map((c) => c._id),
    //   },
    // });

    const data = { answer, category: categoryName, responseData };
    res
      .status(201)
      .json(new apiResponse(201, data, "Answer created successfully"));
  } catch (error) {
    console.error("Gemini API error:", error.response?.data || error.message);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export { chat };
