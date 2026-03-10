import HospitalJobPosting from "../models/HospitalJobPosting.modal.js";

import Hospital from "../models/Hospital.modal.js";
import Category from "../models/Category.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create Job Posting
const createHospitalJobPosting = asyncHandler(async (req, res) => {
  const {
    category,
    date,
    time,
    address,
    hospital,
    phone,
    email,
    jobDescription,
    title,
  } = req.body;

  if (
    !category ||
    !date ||
    !time ||
    !address ||
    !hospital ||
    !phone ||
    !email ||
    !jobDescription ||
    !title
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "All fields are required."));
  }

  try {
    const newJob = new HospitalJobPosting({
      category,
      date,
      time,
      address,
      hospital,
      phone,
      email,
      jobDescription,
      title,
    });
    const savedJob = await newJob.save();

    res
      .status(201)
      .json(new apiResponse(201, savedJob, "Job posting created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get All Job Postings (with filters and search)
const getAllHospitalJobPostings = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      category,
      hospital,
    } = req.query;
    const query = {};

    if (category) query.category = category;
    if (hospital) query.hospital = hospital;

    if (search) {
      const categoryDocs = await Category.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");
      const hospitalDocs = await Hospital.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { jobDescription: { $regex: search, $options: "i" } },
        { category: { $in: categoryDocs.map((cat) => cat._id) } },
        { hospital: { $in: hospitalDocs.map((hos) => hos._id) } },
      ];
    }

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const total = await HospitalJobPosting.countDocuments(query);
      const postings = await HospitalJobPosting.find(query)
        .populate("category", "name")
        .populate("hospital", "name")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      return res.status(200).json(
        new apiResponse(
          200,
          {
            postings,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
          },
          "Job postings fetched successfully"
        )
      );
    } else {
      const postings = await HospitalJobPosting.find(query)
        .populate("category", "name")
        .populate("hospital", "name")
        .sort({ createdAt: -1 });

      return res
        .status(200)
        .json(
          new apiResponse(200, postings, "Job postings fetched successfully")
        );
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get by ID
const getHospitalJobPostingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await HospitalJobPosting.findById(id)
      .populate("category", "name")
      .populate("hospital", "name");

    if (!job) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Job posting not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, job, "Job posting fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update
const updateHospitalJobPosting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const job = await HospitalJobPosting.findById(id);
    if (!job) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Job posting not found"));
    }

    Object.keys(updateData).forEach((key) => {
      job[key] = updateData[key];
    });

    const updatedJob = await job.save();
    res
      .status(200)
      .json(
        new apiResponse(200, updatedJob, "Job posting updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete
const deleteHospitalJobPosting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await HospitalJobPosting.findByIdAndDelete(id);
    if (!job) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Job posting not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, null, "Job posting deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createHospitalJobPosting,
  getAllHospitalJobPostings,
  getHospitalJobPostingById,
  updateHospitalJobPosting,
  deleteHospitalJobPosting,
};
