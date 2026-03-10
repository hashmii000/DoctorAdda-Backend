import Banner from "../models/Banner.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create a new banner
const createBanner = asyncHandler(async (req, res) => {
  const { name,id, imageUrl } = req.body;

  if (!name) {
    return res.status(400).json(new apiResponse(400, null, "Banner name is required."));
  }

  try {
    const banner = new Banner({ name,id, imageUrl });
    const savedBanner = await banner.save();
    res.status(201).json(new apiResponse(201, savedBanner, "Banner created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get all banners
const getAllBanners = asyncHandler(async (req, res) => {
  try {
    const { isPagination = 'true', page = 1, limit = 10, search } = req.query;
    const searchQuery = {};

    if (search) {
      searchQuery.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    if (isPagination === 'true') {
      const skip = (page - 1) * limit;
      const totalBanners = await Banner.countDocuments(searchQuery);
      const banners = await Banner.find(searchQuery).skip(skip).limit(Number(limit));

      res.status(200).json(new apiResponse(200, {
        banners,
        totalBanners,
        totalPages: Math.ceil(totalBanners / limit),
        currentPage: Number(page),
      }, "Banners fetched successfully"));
    } else {
      const banners = await Banner.find(searchQuery);
      res.status(200).json(new apiResponse(200, banners, "Banners fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get single banner by ID
const getBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json(new apiResponse(404, null, "Banner not found"));
    }
    res.status(200).json(new apiResponse(200, banner, "Banner fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update banner by ID
const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json(new apiResponse(404, null, "Banner not found"));
    }

    Object.keys(updateData).forEach((key) => {
      banner[key] = updateData[key];
    });

    const updatedBanner = await banner.save();
    res.status(200).json(new apiResponse(200, updatedBanner, "Banner updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete banner by ID
const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return res.status(404).json(new apiResponse(404, null, "Banner not found"));
    }
    res.status(200).json(new apiResponse(200, null, "Banner deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
};
