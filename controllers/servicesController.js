import Services from "../models/Services.modal.js"; // Updated import path for Services model
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Register a new service
const createService = asyncHandler(async (req, res) => {
  const { name, imageUrl } = req.body;

  if (!name) {
    return res.status(400).json(new apiResponse(400, null, "Service name is required."));
  }

  try {
    const service = new Services({ name, imageUrl });

    const savedService = await service.save();
    res.status(201).json(new apiResponse(201, savedService, "Service created successfully"));

  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get all services with optional pagination and search
const getAllServices = asyncHandler(async (req, res) => {
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
      const totalServices = await Services.countDocuments(searchQuery);
      const services = await Services.find(searchQuery)
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json(new apiResponse(200, {
        services,
        totalServices,
        totalPages: Math.ceil(totalServices / limit),
        currentPage: Number(page),
      }, "Services fetched successfully"));
    } else {
      const services = await Services.find(searchQuery);
      res.status(200).json(new apiResponse(200, services, "Services fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get a service by ID
const getServiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const service = await Services.findById(id);
    if (!service) {
      return res.status(404).json(new apiResponse(404, null, "Service not found"));
    }
    res.status(200).json(new apiResponse(200, service, "Service fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a service by ID
const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const service = await Services.findById(id);

    if (!service) {
      return res.status(404).json(new apiResponse(404, null, "Service not found"));
    }

    // Update service fields
    Object.keys(updateData).forEach((key) => {
      service[key] = updateData[key];
    });

    const updatedService = await service.save();

    res.status(200).json(new apiResponse(200, updatedService, "Service updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete a service by ID
const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const service = await Services.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json(new apiResponse(404, null, "Service not found"));
    }
    res.status(200).json(new apiResponse(200, null, "Service deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService
};
