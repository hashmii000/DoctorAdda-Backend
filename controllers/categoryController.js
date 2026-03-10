import Category from "../models/Category.modal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Register a new category
const createCategory = asyncHandler(async (req, res) => {
  const { name,imageUrl } = req.body;


  if (!name) {
    return res.status(400).json(new apiResponse(400, null, "Category name is required."));
  }

  try {
    const category = new Category({ name,imageUrl });

    const savedCategory = await category.save();
    res.status(201).json(new apiResponse(201, savedCategory, "Category created successfully"));

  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllCategories = asyncHandler(async (req, res) => {
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
      const totalCategories = await Category.countDocuments(searchQuery);
      const categories = await Category.find(searchQuery)
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json(new apiResponse(200, {
        categories,
        totalCategories,
        totalPages: Math.ceil(totalCategories / limit),
        currentPage: Number(page),
      }, "Categories fetched successfully"));
    } else {
      const categories = await Category.find(searchQuery);
      res.status(200).json(new apiResponse(200, categories, "Categories fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get a category by ID
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json(new apiResponse(404, null, "Category not found"));
    }
    res.status(200).json(new apiResponse(200, category, "Category fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a category by ID
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json(new apiResponse(404, null, "Category not found"));
    }

    // Update category fields
    Object.keys(updateData).forEach((key) => {
      category[key] = updateData[key];
    });

    const updatedCategory = await category.save();

    res.status(200).json(new apiResponse(200, updatedCategory, "Category updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete a category by ID
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json(new apiResponse(404, null, "Category not found"));
    }
    res.status(200).json(new apiResponse(200, null, "Category deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
