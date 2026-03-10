import Pharmacy from "../models/Pharmacy.modal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import User from "../models/User.modal.js";
import mongoose from "mongoose";
import { calculateAverageRating } from "../utils/helper.js";
import { createNotifications } from "./notificationController.js";
import axios from "axios";
import PharmacyAppointment from "../models/pharmacybooking.modal.js";
// Create Pharmacy

const getFDAMedicines = asyncHandler(async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const response = await axios.get("https://api.fda.gov/drug/label.json");

    const rawData = response.data.results;

    const medicines = rawData
      .map((item) => item.openfda?.brand_name?.[0])
      .filter(Boolean); // Remove undefined/null

    const uniqueMedicines = [...new Set(medicines)]; // Deduplicate

    res
      .status(200)
      .json(
        new apiResponse(200, uniqueMedicines, "Medicines fetched from FDA")
      );
  } catch (error) {
    console.error("FDA API Error:", error.message);
    res
      .status(500)
      .json(
        new apiResponse(
          500,
          null,
          `Failed to fetch medicines: ${error.message}`
        )
      );
  }
});

const registerPharmacy = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    fcmToken,documents,
    email,
    profileImages,
    address,
    profileImage,
    latitude,
    longitude,
    ownerDetails,
    storeTiming,
    services,
    description,
    cod,
    onlinePayment,
    accountType = "Pharmacy",
    screen="Home"
  } = req.body;

  const { id } = req.params;

  if (!name || !phone || !email || !latitude || !longitude) {
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
    const existingHospital = await Pharmacy.findOne({ phone });
    const existingUser = await User.findById(id);
    await createNotifications({
      title: "Account Upgrade Successfuly",
      comment:
        "Your account upgrade request has been received and is currently under review.",
      userId: existingUser?._id,
      fcmToken: existingUser?.fcmToken,
      screen:screen
    });

    if (existingHospital) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is already registered"));
    }
    const pharmacy = new Pharmacy({
      name,
      phone,
      email,
      address,
      fcmToken,
      profileImages,
      cod,documents,
      onlinePayment,
      profileImage,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      storeTiming,
      userId: existingUser?._id,
      services,
      ownerDetails,
      description,
      accountType,
    });

    const savedPharmacy = await pharmacy.save();

    existingUser.upgradeAccountId = savedPharmacy._id;
    existingUser.upgradeAccountType = savedPharmacy.accountType;
    await existingUser.save();

    res
      .status(201)
      .json(
        new apiResponse(201, savedPharmacy, "Pharmacy registered successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const createPharmacy = asyncHandler(async (req, res) => {
  const {
    name,
    latitude,
    longitude,documents,
    fcmToken,
    profileImages,
    cod,
    onlinePayment,
    phone,
    email,
    description,
    accountType = "Pharmacy",
    services,
    address,
    storeTiming,
    profileImage,
  } = req.body;

  if (!name || !latitude || !longitude || !accountType || !phone || !email) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Required fields missing"));
  }

  const existingUser = await User.findOne({ phone });

  if (existingUser) {
    if (existingUser.isNew) {
      const pharmacy = new Pharmacy({
        name,
        phone,
        email,
        description,
        fcmToken,
        accountType,
        cod,
        onlinePayment,documents,
        profileImages,
        address,
        storeTiming,
        profileImage,
        services,
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      });

      const savedPharmacy = await pharmacy.save();

      existingUser.accountType = accountType;
      existingUser.accountId = savedPharmacy._id;
      existingUser.isNew = false;
      await existingUser.save();

      res
        .status(201)
        .json(
          new apiResponse(201, savedPharmacy, "Pharmacy created successfully")
        );
    } else {
      return res
        .status(400)
        .json(new apiResponse(400, null, "User already linked to an account"));
    }
  } else {
    return res.status(400).json(new apiResponse(400, null, "User not found"));
  }
});

// Get All Pharmacies
const getAllPharmacies = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      category,
      latitude,
      isApprove = "Approved",
      longitude,
      radius = 5000,
      sortBy = "rating",
    } = req.query;

    // Parse and sanitize inputs
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
    // Optional category filter (if used in your schema)
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      match.categories = new mongoose.Types.ObjectId(category);
    }

    // Location-based filtering
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

    let pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categories",
        },
      },
    ];

    // Global multi-keyword search
    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word.replace(/’/g, "'"), "i"));

      const orConditions = words.flatMap((regex) => [
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
        { address: { $regex: regex } },
        { description: { $regex: regex } },
        { "services.name": { $regex: regex } },
        { "categories.name": { $regex: regex } },
        { isApprove: { $regex: regex } },
      ]);

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sorting
    if (parsedSortBy === "rating") {
      pipeline.push({ $sort: { averageRating: -1, createdAt: -1 } });
    } else if (parsedSortBy === "recent") {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Count total before pagination
    const totalPharmacies = await Pharmacy.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalPharmacies[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
      );
    }

    const pharmacies = await Pharmacy.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          pharmacies,
          totalPharmacies: total,
          totalPages: Math.ceil(total / parsedLimit),
          currentPage: parsedPage,
        },
        "Pharmacies fetched successfully"
      )
    );
  } catch (error) {
    console.error(error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get Pharmacy By ID
const getPharmacyById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pharmacy = await Pharmacy.findById(id).populate(
    "reviews.user",
    "name email profilepic"
  );
  if (!pharmacy) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, pharmacy, "Pharmacy fetched successfully"));
});

// Update Pharmacy
const updatePharmacy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const pharmacy = await Pharmacy.findById(id);
  const user = await User.findById(pharmacy?.userId);

  if (!pharmacy) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  if (!updateData?.name) {
    let title = `Your Account ${updateData?.isApprove}`;
    let comment = "";
    if (updateData?.isApprove == "Approved") {
      comment = "Congratulations! Your account has been successfully approved.";

      user.upgradeAccountApproveStatus = true;

      await user.save();

      await createNotifications({
        title,
        comment,
        userId: pharmacy?.userId,
        fcmToken: pharmacy?.fcmToken,
        screen:"Home"
      });
    } else {
      comment =
        "Unfortunately, your account upgrade request has been rejected. Please review and try again.";
    }
  }

  Object.keys(updateData).forEach((key) => {
    pharmacy[key] = updateData[key];
  });

  const updatedPharmacy = await pharmacy.save();
  res
    .status(200)
    .json(
      new apiResponse(200, updatedPharmacy, "Pharmacy updated successfully")
    );
});

// Delete Pharmacy
const deletePharmacy = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const getData = await Pharmacy.findById(id);
  if (!getData) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  await createNotifications({
    title: `Your Upgraded Account Has Been Deleted`,
    comment: `Your upgraded account has been deleted  `,
    userId: getData?.userId,
    fcmToken: getData?.fcmToken,
    screen:"Home"
  });

  await Pharmacy.findByIdAndDelete(id);
  if (getData.userId) {
    const existingUser = await User.findById(getData.userId);
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
        "Pharmacy and linked user deleted successfully"
      )
    );
});

// Add Review
const addReviewToPharmacy = asyncHandler(async (req, res) => {
  const { id: pharmacyId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  if (!rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Rating must be between 1 and 5"));
  }

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  const alreadyReviewed = pharmacy.reviews.find(
    (r) => r.user.toString() === userId.toString()
  );
  if (alreadyReviewed) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "You already reviewed this pharmacy"));
  }

  pharmacy.reviews.push({ user: userId, rating, comment });
  pharmacy.averageRating = calculateAverageRating(pharmacy.reviews);
  await pharmacy.save();

  res
    .status(201)
    .json(new apiResponse(201, pharmacy.reviews, "Review added successfully"));
});

// Update Review
const updatePharmacyReview = asyncHandler(async (req, res) => {
  const { pharmacyId, reviewId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));

  const review = pharmacy.reviews.id(reviewId);
  if (!review)
    return res.status(404).json(new apiResponse(404, null, "Review not found"));

  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to update this review"));
  }

  if (rating) review.rating = rating;
  if (comment) review.comment = comment;

  pharmacy.averageRating = calculateAverageRating(pharmacy.reviews);
  await pharmacy.save();

  res
    .status(200)
    .json(
      new apiResponse(200, pharmacy.reviews, "Review updated successfully")
    );
});

// Delete Review
const deletePharmacyReview = asyncHandler(async (req, res) => {
  const { pharmacyId, reviewId } = req.params;
  const userId = req.user._id;

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));

  const review = pharmacy.reviews.id(reviewId);
  if (!review)
    return res.status(404).json(new apiResponse(404, null, "Review not found"));

  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to delete this review"));
  }

  review.deleteOne();
  pharmacy.averageRating = calculateAverageRating(pharmacy.reviews);
  await pharmacy.save();

  res
    .status(200)
    .json(
      new apiResponse(200, pharmacy.reviews, "Review deleted successfully")
    );
});

// Add Medicine to Pharmacy
const addMedicineToPharmacy = asyncHandler(async (req, res) => {
  const { id: pharmacyId } = req.params;
  const { medicineName, discription, status, price } = req.body;

  if (!medicineName || typeof status !== "boolean") {
    return res
      .status(400)
      .json(new apiResponse(400, null, "medicineName and status are required"));
  }

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  pharmacy.medicine.push({ medicineName, discription, status, price });
  await pharmacy.save();

  res
    .status(201)
    .json(
      new apiResponse(201, pharmacy.medicine, "Medicine added successfully")
    );
});

// Update Pharmacy Medicine
const updatePharmacyMedicine = asyncHandler(async (req, res) => {
  const { pharmacyId, medicineId } = req.params;
  const { medicineName, discription, status, price } = req.body;

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));

  const medicine = pharmacy.medicine.id(medicineId);
  if (!medicine)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Medicine not found"));

  if (medicineName !== undefined) medicine.medicineName = medicineName;
  if (discription !== undefined) medicine.discription = discription;
  if (status !== undefined) medicine.status = status;
  if (price !== undefined) medicine.price = price;

  await pharmacy.save();
  res
    .status(200)
    .json(
      new apiResponse(200, pharmacy.medicine, "Medicine updated successfully")
    );
});

// Delete Pharmacy Medicine
const deletePharmacyMedicine = asyncHandler(async (req, res) => {
  const { pharmacyId, medicineId } = req.params;

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));

  const medicine = pharmacy.medicine.id(medicineId);
  if (!medicine)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Medicine not found"));

  medicine.deleteOne();
  await pharmacy.save();

  res
    .status(200)
    .json(
      new apiResponse(200, pharmacy.medicine, "Medicine deleted successfully")
    );
});

// dashboard

const getPharmacyDashboard = asyncHandler(async (req, res) => {
  const { pharmacyId } = req.params;

  if (!pharmacyId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Pharmacy ID is required"));
  }

  const pharmacy = await Pharmacy.findById(pharmacyId);

  if (!pharmacy) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  // 📌 Total Appointments
  const totalOrders = await PharmacyAppointment.countDocuments({
    pharmacy: pharmacyId,
    PharmacyDelete: false,
  });

  // 📌 Fetch All Appointments with Populated Data
  const appointments = await PharmacyAppointment.find({
    pharmacy: pharmacyId,
    PharmacyDelete: false,
  })
    .populate("patient", "name email phone gender profilepic")
    .populate("pharmacy", "name email phone profileImage")
    .sort({ createdAt: -1 });

  // 📌 Group Appointments by Status
  const ordersByStatus = {
    Pending: [],
    Accepted: [],
    Confirmed: [],
    Packed: [],
    "In Transit": [],
    Delivered: [],
    Rejected: [],
  };

  appointments.forEach((app) => {
    if (ordersByStatus[app.status]) {
      ordersByStatus[app.status].push(app);
    } else {
      ordersByStatus[app.status] = [app];
    }
  });

  // 📌 Count Unique Patients
  const uniquePatients = await PharmacyAppointment.distinct("patient", {
    pharmacy: pharmacyId,
  });

  // 📌 Medicine Usage Count
  // const medicineCounts = {};
  // appointments.forEach((app) => {
  //   app.medicine?.forEach((med) => {
  //     if (med?.medicineName) {
  //       medicineCounts[med.medicineName] =
  //         (medicineCounts[med.medicineName] || 0) + 1;
  //     }
  //   });
  // });

  // 📌 Pharmacy Details
  const pharmacyDetails = {
    name: pharmacy.name,
    phone: pharmacy.phone,
    address: pharmacy.address,
    profileImage: pharmacy.profileImage,
    averageRating: pharmacy.averageRating,
    email: pharmacy.email,
    description: pharmacy.description,
    storeTiming: pharmacy.storeTiming,
  };

  return res.status(200).json(
    new apiResponse(
      200,
      {
        pharmacyDetails,
        totalOrders,
        totalPatients: uniquePatients.length,
        ordersByStatus,
        // medicineCounts,
        
      },
      "Pharmacy dashboard data fetched successfully"
    )
  );
});

export {
  createPharmacy,
  registerPharmacy,
  getAllPharmacies,
  getPharmacyById,
  updatePharmacy,
  deletePharmacy,
  addReviewToPharmacy,
  updatePharmacyReview,
  deletePharmacyReview,
  getPharmacyDashboard,
  addMedicineToPharmacy,
  updatePharmacyMedicine,
  deletePharmacyMedicine,
  getFDAMedicines,
};
