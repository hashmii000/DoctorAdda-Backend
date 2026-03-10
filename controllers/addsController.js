import Add from "../models/Adds.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create a new Add
const createAdd = asyncHandler(async (req, res) => {
  const { title, description, bannerImage,url } = req.body;

  if (!title || !description || !bannerImage) {
    return res.status(400).json(new apiResponse(400, null, "All fields are required."));
  }

  try {
    const newAdd = new Add({ title, description, bannerImage ,url});
    const savedAdd = await newAdd.save();

    res.status(201).json(new apiResponse(201, savedAdd, "Add created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get all Adds
const getAllAdds = asyncHandler(async (req, res) => {
  try {
    const { isPagination = 'true', page = 1, limit = 10, search } = req.query;
    const searchQuery = {};

    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (isPagination === 'true') {
      const skip = (page - 1) * limit;
      const totalAdds = await Add.countDocuments(searchQuery);
      const adds = await Add.find(searchQuery).skip(skip).limit(Number(limit));

      res.status(200).json(new apiResponse(200, {
        adds,
        totalAdds,
        totalPages: Math.ceil(totalAdds / limit),
        currentPage: Number(page)
      }, "Adds fetched successfully"));
    } else {
      const adds = await Add.find(searchQuery);
      res.status(200).json(new apiResponse(200, adds, "Adds fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get Add by ID
const getAddById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const add = await Add.findById(id);
    if (!add) {
      return res.status(404).json(new apiResponse(404, null, "Add not found"));
    }

    res.status(200).json(new apiResponse(200, add, "Add fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update Add
const updateAdd = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const add = await Add.findById(id);
    if (!add) {
      return res.status(404).json(new apiResponse(404, null, "Add not found"));
    }

    Object.keys(updateData).forEach((key) => {
      add[key] = updateData[key];
    });

    const updatedAdd = await add.save();
    res.status(200).json(new apiResponse(200, updatedAdd, "Add updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete Add
const deleteAdd = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const add = await Add.findByIdAndDelete(id);
    if (!add) {
      return res.status(404).json(new apiResponse(404, null, "Add not found"));
    }

    res.status(200).json(new apiResponse(200, null, "Add deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createAdd,
  getAllAdds,
  getAddById,
  updateAdd,
  deleteAdd
};
