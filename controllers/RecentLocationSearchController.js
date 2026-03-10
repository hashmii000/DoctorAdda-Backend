import RecentLocationSearch from "../models/RecentLocationSearch.Modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create a new recent location search
const createRecentLocationSearch = asyncHandler(async (req, res) => {
  const { userId, title } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID is required."));
  }

  if (!title) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Location title is required."));
  }

  try {
    // Check if this search already exists for the user
    let existingSearch = await RecentLocationSearch.findOne({ userId, title });

    if (existingSearch) {
      // Update timestamp to make it most recent
      existingSearch.updatedAt = new Date();
      const updatedSearch = await existingSearch.save();
      return res
        .status(200)
        .json(
          new apiResponse(
            200,
            updatedSearch,
            "Search updated and moved to recent."
          )
        );
    }

    // Count user's current searches
    const searchCount = await RecentLocationSearch.countDocuments({ userId });

    // If more than or equal 10, remove the oldest one
    if (searchCount >= 10) {
      const oldestSearch = await RecentLocationSearch.findOne({ userId }).sort({
        createdAt: 1,
      });
      if (oldestSearch) {
        await oldestSearch.deleteOne();
      }
    }

    // Create new search
    const newSearch = new RecentLocationSearch({ userId, title });
    const savedSearch = await newSearch.save();

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          savedSearch,
          "Recent location search added successfully."
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get all recent location searches with optional pagination and search
const getAllRecentLocationSearches = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      userId,
    } = req.query;

    const searchQuery = {};
    if (userId) searchQuery.userId = userId;
    if (search) {
      searchQuery.title = { $regex: search, $options: "i" };
    }

    const sortBy = { updatedAt: -1 }; // Most recent on top

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const totalSearches = await RecentLocationSearch.countDocuments(
        searchQuery
      );
      const searches = await RecentLocationSearch.find(searchQuery)
        .sort(sortBy)
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json(
        new apiResponse(
          200,
          {
            searches,
            totalSearches,
            totalPages: Math.ceil(totalSearches / limit),
            currentPage: Number(page),
          },
          "Recent location searches fetched successfully"
        )
      );
    } else {
      const searches = await RecentLocationSearch.find(searchQuery).sort(
        sortBy
      );
      res
        .status(200)
        .json(
          new apiResponse(
            200,
            searches,
            "Recent location searches fetched successfully"
          )
        );
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get a recent location search by ID
const getRecentLocationSearchById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const search = await RecentLocationSearch.findById(id);
    if (!search) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Recent location search not found"));
    }
    res
      .status(200)
      .json(
        new apiResponse(
          200,
          search,
          "Recent location search fetched successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a recent location search by ID
const updateRecentLocationSearch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const search = await RecentLocationSearch.findById(id);
    if (!search) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Recent location search not found"));
    }

    Object.keys(updateData).forEach((key) => {
      search[key] = updateData[key];
    });

    const updatedSearch = await search.save();
    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedSearch,
          "Recent location search updated successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete a recent location search by ID
const deleteRecentLocationSearch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const search = await RecentLocationSearch.findByIdAndDelete(id);
    if (!search) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Recent location search not found"));
    }
    res
      .status(200)
      .json(
        new apiResponse(
          200,
          null,
          "Recent location search deleted successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createRecentLocationSearch,
  getAllRecentLocationSearches,
  getRecentLocationSearchById,
  updateRecentLocationSearch,
  deleteRecentLocationSearch,
};
