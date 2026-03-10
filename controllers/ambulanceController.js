import Ambulance from "../models/Ambulance.modal.js";

import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";
import { generateOTP } from "../utils/generateOTP.js";
import { calculateAverageRating } from "../utils/helper.js";
import { createNotifications } from "./notificationController.js";
// Register Ambulance
const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

const registerAmbulances = asyncHandler(async (req, res) => {
  const {
    name,
    fcmToken,
    gpsTraking,documents,
    phone,
    address,
    latitude,
    profileImages,
    longitude,
    capacity,
    ownerDetails,
    price,
    description,
    accountType = "Ambulance",
    ambulanceType,

    driverInfo,
    availabilityStatus = "Available",
    operatingHours,
    profilepic,
    emergencyContact,
    screen="Home"
  } = req.body;
  const { id } = req.params;

  // Basic validations
  if (!name || !phone || !address || !latitude || !longitude) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid coordinates."));
  }

  try {
    const existingAmbulance = await Ambulance.findOne({ phone });
    const existingUser = await User.findById(id);

    await createNotifications({
      title: "Account Upgrade Successfuly",
      comment:
        "Your account upgrade request has been received and is currently under review.",
      userId: existingUser?._id,
      fcmToken: existingUser?.fcmToken,
      screen:screen
    });

    if (existingAmbulance) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is already registered"));
    }

    const ambulance = new Ambulance({
      name,
      phone,
      address,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      capacity,
      ownerDetails,gpsTraking,documents,
      price,
      description,
      profileImages,
      accountType,
      ambulanceType,
      userId: existingUser?._id,
      fcmToken,
      driverInfo,
      profilepic,
      availabilityStatus,
      operatingHours,
      emergencyContact,
    });

    const savedAmbulance = await ambulance.save();

    existingUser.upgradeAccountId = savedAmbulance._id;
    existingUser.upgradeAccountType = savedAmbulance?.accountType;
    await existingUser.save();

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          savedAmbulance,
          "Ambulance registered successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const registerAmbulance = asyncHandler(async (req, res) => {
  const {
    phone,
    name,
    fcmToken,
    address,
    ambulanceType,gpsTraking,documents,
    profileImages,
    ambulanceNumber,
    emergencyContact,
    latitude,
    longitude,
    accountType,
    driverInfo,
    operatingHours,
    capacity,
    description,
  } = req.body;

  if (
    !phone ||
    !name ||
    !address ||
    !latitude ||
    !longitude ||
    !ambulanceNumber ||
    !accountType
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  const existingUser = await User.findOne({ phone });

  if (existingUser) {
    if (existingUser.isNew) {
      const ambulance = new Ambulance({
        phone,
        name,
        address,
        ambulanceType,
        ambulanceNumber,gpsTraking,documents,
        emergencyContact,
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        accountType,
        profileImages,
        fcmToken,
        driverInfo,
        operatingHours,
        capacity,
        description,
      });

      const savedAmbulance = await ambulance.save();

      existingUser.accountType = accountType;
      existingUser.accountId = savedAmbulance._id;
      existingUser.isNew = false;
      await existingUser.save();

      return res
        .status(201)
        .json(
          new apiResponse(
            201,
            savedAmbulance,
            "Ambulance registered successfully"
          )
        );
    } else {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "User already exists with this number")
        );
    }
  } else {
    return res.status(400).json(new apiResponse(400, null, "User not found."));
  }
});

const getAllAmbulances = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      latitude,
      longitude,
      radius = 5000,
      isApprove = "Approved",
      ambulanceType,
      sortBy = "rating",
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit)));
    const parsedRadius = Math.max(1, parseInt(radius));
    const parsedSortBy = ["rating", "recent"].includes(sortBy)
      ? sortBy
      : "rating";

    const match = {};

    if (isApprove) {
      match.isApprove = { $regex: isApprove, $options: "i" };
    }

    if (ambulanceType) {
      match.ambulanceType = { $regex: ambulanceType, $options: "i" };
    }

    if (latitude && longitude) {
      const lng = parseFloat(longitude);
      const lat = parseFloat(latitude);
      const earthRadiusInKm = 6378.1;
      const radiusInRadians = parsedRadius / 1000 / earthRadiusInKm;

      match.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      };
    }

    let pipeline = [{ $match: match }];

    // Keyword search
    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));

      const orConditions = words.flatMap((regex) => [
        { name: { $regex: regex } },
        { address: { $regex: regex } },
        { phone: { $regex: regex } },
        { isApprove: { $regex: regex } },
        { ambulanceNumber: { $regex: regex } },
        { "driverInfo.name": { $regex: regex } },
        { "driverInfo.phone": { $regex: regex } },
      ]);

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sorting
    if (parsedSortBy === "rating") {
      pipeline.push({ $sort: { averageRating: -1, createdAt: -1 } });
    } else if (parsedSortBy === "recent") {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Count total ambulances
    const totalAmbulances = await Ambulance.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalAmbulances[0]?.count || 0;

    // Apply pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
      );
    }

    const ambulances = await Ambulance.aggregate(pipeline);

    return res.status(200).json(
      new apiResponse(
        200,
        {
          ambulances,
          totalAmbulances: total,
          totalPages: Math.ceil(total / parsedLimit),
          currentPage: parsedPage,
        },
        "Ambulances fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAmbulanceById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Find ambulance by ID
    const ambulance = await Ambulance.findById(id).populate(
      "reviews.user",
      "name email profilepic"
    );

    if (!ambulance) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Ambulance not found"));
    }

    return res
      .status(200)
      .json(new apiResponse(200, ambulance, "Ambulance fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateAmbulance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const ambulance = await Ambulance.findById(id);
    const user = await User.findById(ambulance?.userId);

    if (!ambulance) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Ambulance not found"));
    }

    if (updateData.latitude && updateData.longitude) {
      updateData.location = {
        type: "Point",
        coordinates: [
          parseFloat(updateData.longitude),
          parseFloat(updateData.latitude),
        ],
      };
    }

    if (!updateData?.name) {
      let title = `Your Account ${updateData?.isApprove}`;
      let comment = "";
      if (updateData?.isApprove == "Approved") {
        comment =
          "Congratulations! Your account has been successfully approved.";
        user.upgradeAccountApproveStatus = true;

        await user.save();
        await createNotifications({
          title,
          comment,
          userId: ambulance?.userId,
          fcmToken: ambulance?.fcmToken,
          screen:"Home"
        });
      } else {
        comment =
          "Unfortunately, your account upgrade request has been rejected. Please review and try again.";
      }
    }

    const restrictedFields = ["_id", "createdAt", "updatedAt"];
    restrictedFields.forEach((field) => delete updateData[field]);

    Object.keys(updateData).forEach((key) => {
      ambulance[key] = updateData[key];
    });

    const updatedAmbulance = await ambulance.save();

    res
      .status(200)
      .json(
        new apiResponse(200, updatedAmbulance, "Ambulance updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteAmbulance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const getData = await Ambulance.findById(id);

    if (!getData) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Ambulance not found"));
    }
    await Ambulance.findByIdAndDelete(id);

    await createNotifications({
      title: `Your Upgraded Account Has Been Deleted`,
      comment: `Your upgraded account has been deleted  `,
      userId: getData?.userId,
      fcmToken: getData?.fcmToken,
      screen: "Home"
    });

    if (getData.userId) {
      const existingUser = await User.findById(getData?.userId);
      existingUser.upgradeAccountId = null;
      existingUser.upgradeAccountType = "";
      await existingUser.save();
    }

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          null,
          "Ambulance and linked user deleted successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const addAmbulanceVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vehicleData = req.body;

  const ambulance = await Ambulance.findById(id);
  if (!ambulance) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Ambulance not found"));
  }

  ambulance.ambulanceVehicles.push(vehicleData);
  await ambulance.save();

  res
    .status(200)
    .json(
      new apiResponse(200, ambulance, "Ambulance vehicle added successfully")
    );
});

const updateAmbulanceVehicle = asyncHandler(async (req, res) => {
  const { ambulanceId, vehicleId } = req.params;
  const updateData = req.body;

  const ambulance = await Ambulance.findById(ambulanceId);
  if (!ambulance) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Ambulance not found"));
  }

  const vehicle = ambulance.ambulanceVehicles.id(vehicleId);
  if (!vehicle) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Vehicle not found"));
  }

  Object.assign(vehicle, updateData); // merge updates
  await ambulance.save();

  res
    .status(200)
    .json(
      new apiResponse(200, ambulance, "Ambulance vehicle updated successfully")
    );
});

const deleteAmbulanceVehicle = asyncHandler(async (req, res) => {
  const { ambulanceId, vehicleId } = req.params;

  const ambulance = await Ambulance.findById(ambulanceId);
  if (!ambulance) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Ambulance not found"));
  }

  const vehicle = ambulance.ambulanceVehicles.id(vehicleId);
  if (!vehicle) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Vehicle not found"));
  }

  ambulance.ambulanceVehicles.pull(vehicleId); // <- Fix here
  await ambulance.save();

  res
    .status(200)
    .json(
      new apiResponse(200, ambulance, "Ambulance vehicle deleted successfully")
    );
});

const getAmbulanceDashboard = asyncHandler(async (req, res) => {
  const { ambulanceId } = req.params;

  if (!ambulanceId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Ambulance ID is required"));
  }

  const ambulance = await Ambulance.findById(ambulanceId);

  const ambulanceDetails = {
    name: ambulance.name,
    phone: ambulance.phone,
    address: ambulance.address,
    averageRating: ambulance.averageRating,
    availabilityStatus: ambulance.availabilityStatus,
    profileImage: ambulance.profileImage,
  };

  if (!ambulance) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Ambulance not found"));
  }

  return res.status(200).json(
    new apiResponse(
      200,
      {
        ambulanceDetails,
        ambulance,
      },
      "Ambulance dashboard data fetched successfully"
    )
  );
});

const addReviewToAmbulance = asyncHandler(async (req, res) => {
  const { id: ambulanceId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  if (!rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Rating must be between 1 and 5"));
  }

  const ambulance = await Ambulance.findById(ambulanceId);
  if (!ambulance) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Ambulance not found"));
  }

  // Check if user already reviewed
  const alreadyReviewed = ambulance.reviews.find(
    (r) => r.user.toString() === userId.toString()
  );

  if (alreadyReviewed) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "You have already reviewed this doctor")
      );
  }

  ambulance.reviews.push({ user: userId, rating, comment });
  ambulance.averageRating = calculateAverageRating(ambulance.reviews);
  await ambulance.save();

  res
    .status(201)
    .json(new apiResponse(201, ambulance.reviews, "Review added successfully"));
});

const updateAmbulanceReview = asyncHandler(async (req, res) => {
  const { ambulanceId, reviewId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id; // authenticated user

  const ambulance = await Ambulance.findById(ambulanceId);
  if (!ambulance) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Ambulance not found"));
  }

  const review = ambulance.reviews.id(reviewId);

  if (!review) {
    return res.status(404).json(new apiResponse(404, null, "Review not found"));
  }

  // Optional: only allow the original reviewer to update
  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to update this review"));
  }

  if (rating) review.rating = rating;
  if (comment) review.comment = comment;

  ambulance.averageRating = calculateAverageRating(ambulance.reviews);
  await ambulance.save();

  res
    .status(200)
    .json(
      new apiResponse(200, ambulance.reviews, "Review updated successfully")
    );
});

const deleteAmbulanceReview = asyncHandler(async (req, res) => {
  const { ambulanceId, reviewId } = req.params;
  const userId = req.user._id;

  const ambulance = await Ambulance.findById(ambulanceId);
  if (!ambulance) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Ambulance not found"));
  }

  const review = ambulance.reviews.id(reviewId);
  if (!review) {
    return res.status(404).json(new apiResponse(404, null, "Review not found"));
  }

  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to delete this review"));
  }

  review.deleteOne(); // remove the review
  ambulance.averageRating = calculateAverageRating(ambulance.reviews);
  await ambulance.save();

  res
    .status(200)
    .json(
      new apiResponse(200, ambulance.reviews, "Review deleted successfully")
    );
});

export {
  registerAmbulances,
  registerAmbulance,
  getAllAmbulances,
  getAmbulanceById,
  updateAmbulance,
  deleteAmbulance,
  addReviewToAmbulance,
  updateAmbulanceReview,
  deleteAmbulanceReview,
  getAmbulanceDashboard,
  addAmbulanceVehicle,
  updateAmbulanceVehicle,
  deleteAmbulanceVehicle,
};
