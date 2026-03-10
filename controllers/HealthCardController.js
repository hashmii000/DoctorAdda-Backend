import HealthCard from "../models/HealthCard.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create a new Health Card
const createHealthCard = asyncHandler(async (req, res) => {
  const { name, imageUrl } = req.body;

  if (!name) {
    return res.status(400).json(new apiResponse(400, null, "Health card name is required."));
  }

  try {
    const healthCard = new HealthCard({ name, imageUrl });

    const savedHealthCard = await healthCard.save();
    res.status(201).json(new apiResponse(201, savedHealthCard, "Health card created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get all Health Cards
const getAllHealthCards = asyncHandler(async (req, res) => {
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
      const totalHealthCards = await HealthCard.countDocuments(searchQuery);
      const healthCards = await HealthCard.find(searchQuery)
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json(new apiResponse(200, {
        healthCards,
        totalHealthCards,
        totalPages: Math.ceil(totalHealthCards / limit),
        currentPage: Number(page),
      }, "Health cards fetched successfully"));
    } else {
      const healthCards = await HealthCard.find(searchQuery);
      res.status(200).json(new apiResponse(200, healthCards, "Health cards fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get a Health Card by ID
const getHealthCardById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const healthCard = await HealthCard.findById(id);

    if (!healthCard) {
      return res.status(404).json(new apiResponse(404, null, "Health card not found"));
    }
    res.status(200).json(new apiResponse(200, healthCard, "Health card fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a Health Card by ID
const updateHealthCard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const healthCard = await HealthCard.findById(id);

    if (!healthCard) {
      return res.status(404).json(new apiResponse(404, null, "Health card not found"));
    }

    // Update health card fields
    Object.keys(updateData).forEach((key) => {
      healthCard[key] = updateData[key];
    });

    const updatedHealthCard = await healthCard.save();

    res.status(200).json(new apiResponse(200, updatedHealthCard, "Health card updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete a Health Card by ID
const deleteHealthCard = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const healthCard = await HealthCard.findByIdAndDelete(id);
    if (!healthCard) {
      return res.status(404).json(new apiResponse(404, null, "Health card not found"));
    }
    res.status(200).json(new apiResponse(200, null, "Health card deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createHealthCard,
  getAllHealthCards,
  getHealthCardById,
  updateHealthCard,
  deleteHealthCard
};
