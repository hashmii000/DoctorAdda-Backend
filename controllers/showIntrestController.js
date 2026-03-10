import ShowIntrest from "../models/ShowIntrest.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import Doctor from "../models/Doctor.modal.js";
import Hospital from "../models/Hospital.modal.js";
import HospitalJobPosting from "../models/HospitalJobPosting.modal.js";

// Create a new ShowIntrest entry
const createShowIntrest = asyncHandler(async (req, res) => {
  const { doctorId, hospitalId, hospitalJobPostingId, status } = req.body;

  if (!doctorId || !hospitalId) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Doctor and Hospital IDs are required.")
      );
  }

  const existingDoctor = await Doctor.findById(doctorId);
  if (!existingDoctor) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Doctor not found."));
  }

  const existingHospital = await Hospital.findById(hospitalId);
  if (!existingHospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found."));
  }

  // ✅ Check hospitalJobPostingId only if provided
  if (hospitalJobPostingId) {
    const existingHospitalJobPosting = await HospitalJobPosting.findById(
      hospitalJobPostingId
    );
    if (!existingHospitalJobPosting) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital Job Posting not found."));
    }
  }

  try {
    const showIntrest = new ShowIntrest({
      doctorId,
      hospitalId,
      status,
      ...(hospitalJobPostingId && { hospitalJobPostingId }), // Optional field
    });

    const savedIntrest = await showIntrest.save();

    res
      .status(201)
      .json(new apiResponse(201, savedIntrest, "Interest shown successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get all ShowIntrest entries
const getAllShowIntrests = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      doctorId,
      hospitalId,
      hospitalJobPostingId,
      status,
    } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (doctorId) {
      query.doctorId = doctorId;
    }
    if (hospitalId) {
      query.hospitalId = hospitalId;
    }
    if (hospitalJobPostingId) {
      query.hospitalJobPostingId = hospitalJobPostingId;
    }
    const populateOptions = [
      {
        path: "doctorId",
        select:
          "fullName profilepic email gender phone experience about education category",
      },
      {
        path: "hospitalId",
        select: "name address phone email description",
      },
      {
        path: "hospitalJobPostingId",
        select: "title jobDescription email phone address category",
      },
    ];

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const total = await ShowIntrest.countDocuments(query);
      const records = await ShowIntrest.find(query)
        .populate(populateOptions)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      res.status(200).json(
        new apiResponse(
          200,
          {
            records,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
          },
          "Interests fetched successfully."
        )
      );
    } else {
      const records = await ShowIntrest.find(query)
        .populate("doctorId hospitalId hospitalJobPostingId")
        .sort({ createdAt: -1 });

      res
        .status(200)
        .json(new apiResponse(200, records, "Interests fetched successfully."));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get single ShowIntrest by ID
const getShowIntrestById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const showIntrest = await ShowIntrest.findById(id).populate(
      "doctorId hospitalId hospitalJobPostingId"
    );

    if (!showIntrest) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Interest not found."));
    }

    res
      .status(200)
      .json(
        new apiResponse(200, showIntrest, "Interest fetched successfully.")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update ShowIntrest by ID
const updateShowIntrest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const showIntrest = await ShowIntrest.findById(id);
    if (!showIntrest) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Interest not found."));
    }

    Object.keys(updateData).forEach((key) => {
      showIntrest[key] = updateData[key];
    });

    const updated = await showIntrest.save();
    res
      .status(200)
      .json(new apiResponse(200, updated, "Interest updated successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete ShowIntrest by ID
const deleteShowIntrest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await ShowIntrest.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Interest not found."));
    }
    res
      .status(200)
      .json(new apiResponse(200, null, "Interest deleted successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createShowIntrest,
  getAllShowIntrests,
  getShowIntrestById,
  updateShowIntrest,
  deleteShowIntrest,
};
