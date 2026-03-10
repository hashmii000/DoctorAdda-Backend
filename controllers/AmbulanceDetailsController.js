import AmbulanceDetails from "../models/AmbulanceDetails.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import Ambulance from "../models/Ambulance.modal.js";
// Create new ambulance detail
const createAmbulanceDetail = asyncHandler(async (req, res) => {
  const {
    title,
    AmbulanceId,
    kms,
    perKmPriceAfterMax = 0,
    discountPercent = 0,
  } = req.body;

  if (!title || !AmbulanceId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Title & AmbulanceId are required."));
  }

  // Check if valid AmbulanceId exists in DB
  const isAmbulanceExist = await Ambulance.findById(AmbulanceId);
  if (!isAmbulanceExist) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Invalid AmbulanceId"));
  }

  // Set all existing details of SAME ambulance inactive
  await AmbulanceDetails.updateMany(
    { AmbulanceId },
    { $set: { active: false } }
  );

  const newDetail = await AmbulanceDetails.create({
    title,
    AmbulanceId,
    kms,
    perKmPriceAfterMax,
    discountPercent,
    active: true,
  });

  res
    .status(201)
    .json(
      new apiResponse(201, newDetail, "Ambulance detail added & marked active")
    );
});

// Get all ambulance details with optional pagination & search
const getAllAmbulanceDetails = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page = 1,
    limit = 10,
    search,
    active,
    ambulanceId,
  } = req.query;

  const searchQuery = {};

  if (search) {
    searchQuery.title = { $regex: search, $options: "i" };
  }

  if (active !== undefined) {
    searchQuery.active = active === "true";
  }

  // ✅ Filter by Specific Ambulance
  if (ambulanceId) {
    searchQuery.AmbulanceId = ambulanceId;
  }

  if (isPagination === "true") {
    const skip = (page - 1) * limit;
    const totalDetails = await AmbulanceDetails.countDocuments(searchQuery);

    const details = await AmbulanceDetails.find(searchQuery)
      .populate("AmbulanceId")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    return res.status(200).json(
      new apiResponse(
        200,
        {
          details,
          totalDetails,
          totalPages: Math.ceil(totalDetails / limit),
          currentPage: Number(page),
        },
        "Ambulance details fetched successfully"
      )
    );
  }

  const details = await AmbulanceDetails.find(searchQuery)
    .populate("AmbulanceId")
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json(
      new apiResponse(200, details, "Ambulance details fetched successfully")
    );
});

// Get single ambulance detail by ID
const getAmbulanceDetailById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const detail = await AmbulanceDetails.findById(id).populate("AmbulanceId"); // ✅ populate added

    if (!detail) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Ambulance detail not found"));
    }

    return res
      .status(200)
      .json(
        new apiResponse(200, detail, "Ambulance detail fetched successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update ambulance detail by ID
const updateAmbulanceDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const detail = await AmbulanceDetails.findById(id).populate("AmbulanceId");

    if (!detail) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Ambulance detail not found"));
    }

    // ✅ If active is being set true,
    // make other details inactive only for SAME AmbulanceId
    if (updateData.active === true) {
      await AmbulanceDetails.updateMany(
        {
          _id: { $ne: id },
          AmbulanceId: detail.AmbulanceId._id, // ✅ filter within same ambulance
        },
        { $set: { active: false } }
      );
    }

    // ✅ Update fields dynamically
    Object.keys(updateData).forEach((key) => {
      detail[key] = updateData[key];
    });

    const updatedDetail = await detail.save();

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedDetail,
          "Ambulance detail updated successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete ambulance detail by ID
const deleteAmbulanceDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const detail = await AmbulanceDetails.findById(id);

    if (!detail) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Ambulance detail not found"));
    }

    // ✅ Prevent delete if record is currently active
    if (detail.active === true) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Cannot delete active detail. Please activate another detail before deleting this one."
          )
        );
    }

    await AmbulanceDetails.findByIdAndDelete(id);

    return res
      .status(200)
      .json(
        new apiResponse(200, null, "Ambulance detail deleted successfully")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createAmbulanceDetail,
  getAllAmbulanceDetails,
  getAmbulanceDetailById,
  updateAmbulanceDetail,
  deleteAmbulanceDetail,
};
