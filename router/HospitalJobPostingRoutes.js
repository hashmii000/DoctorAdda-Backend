import { Router } from "express";
import {
  createHospitalJobPosting,
  getAllHospitalJobPostings,
  getHospitalJobPostingById,
  updateHospitalJobPosting,
  deleteHospitalJobPosting
} from "../controllers/hospitalJobPostController.js";

const router = Router();

router.route("/").post(createHospitalJobPosting);          // Create Job Posting
router.route("/").get(getAllHospitalJobPostings);          // Get all Job Postings
router.route("/:id").get(getHospitalJobPostingById);       // Get Job Posting by ID
router.route("/:id").patch(updateHospitalJobPosting);      // Update Job Posting
router.route("/:id").delete(deleteHospitalJobPosting);     // Delete Job Posting

export default router;
