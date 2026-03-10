import Facilitie from "../models/Facilities.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Register a new Facilitie
const createFacilitie = asyncHandler(async (req, res) => {
  const { name } = req.body;


  if (!name) {
    return res.status(400).json(new apiResponse(400, null, "Facilitie name is required."));
  }

  try {
    const facilitie = new Facilitie({ name });

    const savedFacilitie = await facilitie.save();
    res.status(201).json(new apiResponse(201, savedFacilitie, "Facilitie created successfully"));

  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllFacilitie = asyncHandler(async (req, res) => {
  try {
    const { isPagination = 'true', page = 1, limit = 10, search } = req.query;

    const searchQuery = {};


    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },

      ];
    }






    if (isPagination === 'true') {
      const skip = (page - 1) * limit;
      const totalCategories = await Facilitie.countDocuments(searchQuery);
      const categories = await Facilitie.find(searchQuery)
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json(new apiResponse(200, {
        categories,
        totalCategories,
        totalPages: Math.ceil(totalCategories / limit),
        currentPage: Number(page),
      }, "Categories fetched successfully"));
    } else {
      const categories = await Facilitie.find(searchQuery);
      res.status(200).json(new apiResponse(200, categories, "Categories fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get a Facilitie by ID
const getFacilitieById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const facilitie = await Facilitie.findById(id);
    if (!facilitie) {
      return res.status(404).json(new apiResponse(404, null, "Facilitie not found"));
    }
    res.status(200).json(new apiResponse(200, facilitie, "Facilitie fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a Facilitie by ID
const updateFacilitie = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const facilitie = await Facilitie.findById(id);

    if (!facilitie) {
      return res.status(404).json(new apiResponse(404, null, "Facilitie not found"));
    }

    // Update Facilitie fields
    Object.keys(updateData).forEach((key) => {
        facilitie[key] = updateData[key];
    });

    const updatedFacilitie = await facilitie.save();

    res.status(200).json(new apiResponse(200, updatedFacilitie, "Facilitie updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete a Facilitie by ID
const deleteFacilitie = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const facilitie = await Facilitie.findByIdAndDelete(id);
    if (!facilitie) {
      return res.status(404).json(new apiResponse(404, null, "Facilitie not found"));
    }
    res.status(200).json(new apiResponse(200, null, "Facilitie deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createFacilitie,
  getAllFacilitie,
  getFacilitieById,
  updateFacilitie,
  deleteFacilitie
};
