import express from "express";
import multer from "multer";
import { uploadReport } from "../controllers/reportChatController.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/reports",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post(
  "/upload-report",
  upload.single("report"),
  uploadReport
);

export default router;