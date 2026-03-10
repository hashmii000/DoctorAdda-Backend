import Diagnostic from "../models/Diagnostic.modal.js";
import DiagnosticAppointment from "../models/DiagnosticBookingModal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import User from "../models/User.modal.js";
import { calculateAverageRating } from "../utils/helper.js";
import { createNotifications } from "./notificationController.js";
import moment from "moment";

export const generateAvailability = (
  startTime,
  endTime,
  duration,
  days = 2
) => {
  const availability = [];

  // Loop for 14 days starting from today (0 = today)
  for (let i = 0; i < days; i++) {
    const date = moment().add(i, "days").startOf("day"); // e.g., 2025-05-13
    const slots = [];

    // Set the slot start and end times for the current day
    let slotStart = moment(
      `${date.format("YYYY-MM-DD")} ${startTime}`,
      "YYYY-MM-DD HH:mm"
    );
    const slotEnd = moment(
      `${date.format("YYYY-MM-DD")} ${endTime}`,
      "YYYY-MM-DD HH:mm"
    );

    // Create 30-minute time slots
    while (slotStart < slotEnd) {
      const slotFinish = slotStart.clone().add(duration, "minutes");
      if (slotFinish > slotEnd) break;

      slots.push({
        startTime: slotStart.format("hh:mm A"), // e.g., 01:00 PM
        endTime: slotFinish.format("hh:mm A"),

        isBooked: false,
      });

      slotStart = slotFinish;
    }

    // Push the date and its slots to the availability array
    availability.push({
      date: date.format("YYYY-MM-DD"), // e.g., "2025-05-13"
      slots,
    });
  }

  return availability;
};

export const generateAvailabilityafterDate = (
  startTime,
  endTime,
  lastDate,
  duration,
  days = 2
) => {
  const availability = [];

  const startDate = moment(lastDate, "YYYY-MM-DD").add(1, "day").startOf("day");

  // Loop for 14 days starting from today (0 = today)
  for (let i = 0; i < days; i++) {
    // const date = moment().add(i, "days").startOf("day"); // e.g., 2025-05-13
    const date = startDate.clone().add(i, "days");
    const slots = [];

    // Set the slot start and end times for the current day
    let slotStart = moment(
      `${date.format("YYYY-MM-DD")} ${startTime}`,
      "YYYY-MM-DD HH:mm"
    );
    const slotEnd = moment(
      `${date.format("YYYY-MM-DD")} ${endTime}`,
      "YYYY-MM-DD HH:mm"
    );

    // Create 30-minute time slots
    while (slotStart < slotEnd) {
      const slotFinish = slotStart.clone().add(duration, "minutes");
      if (slotFinish > slotEnd) break;

      slots.push({
        startTime: slotStart.format("hh:mm A"), // e.g., 01:00 PM
        endTime: slotFinish.format("hh:mm A"),

        isBooked: false,
      });

      slotStart = slotFinish;
    }

    // Push the date and its slots to the availability array
    availability.push({
      date: date.format("YYYY-MM-DD"), // e.g., "2025-05-13"
      slots,
    });
  }

  return availability;
};

const registerDiagnostic = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    fcmToken,
    email,
    address,
    profileImage,
    documents,
    profileImages,
    latitude,
    longitude,
    storeTiming,
    startTime,
    endTime,
    duration = "30",
    isBloodBank,
    bloodBank,
    services,
    packages,
    ownerDetails,
    description,
    accountType = "Diagnostic",
    screen = "Home",
  } = req.body;

  const { id } = req.params;

  if (!name || !phone || !email || !latitude || !longitude) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  let availability = [];

  if (startTime && endTime) {
    availability = generateAvailability(startTime, endTime, duration);
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid coordinates."));
  }

  try {
    const existingHospital = await Diagnostic.findOne({ phone });
    const existingUser = await User.findById(id);

    await createNotifications({
      title: "Account Upgrade Successfuly",
      comment:
        "Your account upgrade request has been received and is currently under review.",
      userId: existingUser?._id,
      fcmToken: existingUser?.fcmToken,
      screen: screen,
    });

    if (existingHospital) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is already registered"));
    }
    if (!existingUser) {
      return res.status(400).json(new apiResponse(400, null, "User Not Found"));
    }

    const diagnostic = new Diagnostic({
      name,
      phone,
      email,
      address,
      profileImage,
      profileImages,
      bloodBank,
      fcmToken,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      userId: existingUser?._id,
      storeTiming,
      services,
      availability,
      documents,
      startTime,
      endTime,
      duration,
      isBloodBank,
      packages,
      ownerDetails,
      description,
      accountType,
    });

    const savedDiagnostic = await diagnostic.save();

    existingUser.upgradeAccountId = savedDiagnostic._id;
    existingUser.upgradeAccountType = savedDiagnostic.accountType;
    await existingUser.save();

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          savedDiagnostic,
          "Diagnostic center registered successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const regenerateAvailabilityOfDiagnostic = asyncHandler(async (req, res) => {
  const { diagnosticId, days } = req.body;

  try {
    const doctor = await Diagnostic.findById(diagnosticId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Diagnostic not found"));
    }

    if (doctor.startTime && doctor.endTime) {
      if (doctor.availability.length === 0) {
        doctor.availability = generateAvailability(
          doctor.startTime,
          doctor.endTime,
          doctor.duration || "30",
          days
        );
      } else {
        const newAvailability = generateAvailabilityafterDate(
          doctor.startTime,
          doctor.endTime,
          doctor?.availability?.[doctor.availability.length - 1]?.date,
          doctor.duration || "30",
          days
        );
        const existingAvailability = Array.isArray(doctor.availability)
          ? doctor.availability
          : [];

        doctor.availability = [...existingAvailability, ...newAvailability];
      }
    }

    await doctor.save();
    return res
      .status(200)
      .json(
        new apiResponse(200, doctor, "Availability regenerated successfully")
      );
  } catch (error) {
    console.error("Regenerate Availability Error:", error);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const regenerateAvailability = asyncHandler(async (req, res) => {
  const { diagnosticId } = req.body;

  try {
    const doctor = await Diagnostic.findById(diagnosticId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Diagnostic not found"));
    }

    let updated = false;
    const today = moment().startOf("day");

    const lastClinicAvailability =
      doctor.availability?.[doctor.availability.length - 1]?.date;
    const needsClinicUpdate =
      !lastClinicAvailability || moment(lastClinicAvailability).isBefore(today);

    if (needsClinicUpdate && doctor.startTime && doctor.endTime) {
      doctor.availability = generateAvailability(
        doctor.startTime,
        doctor.endTime,
        doctor.duration || "30"
      );
      updated = true;
    }

    if (!updated) {
      return res
        .status(200)
        .json(
          new apiResponse(200, doctor, "Availability is already up to date")
        );
    }

    await doctor.save();
    return res
      .status(200)
      .json(
        new apiResponse(200, doctor, "Availability regenerated successfully")
      );
  } catch (error) {
    console.error("Regenerate Availability Error:", error);
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const createDiagnostic = asyncHandler(async (req, res) => {
  const {
    name,
    latitude,
    documents,
    fcmToken,
    longitude,
    profileImages,
    phone,
    email,
    description,
    accountType = "Diagnostic",
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
      const diagnostic = new Diagnostic({
        name,
        phone,
        email,
        description,
        accountType,
        profileImages,
        documents,
        address,
        fcmToken,
        storeTiming,
        profileImage,
        services,
        location: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      });

      const savedDiagnostic = await diagnostic.save();

      existingUser.accountType = accountType;
      existingUser.accountId = savedDiagnostic._id;
      existingUser.isNew = false;
      await existingUser.save();

      res
        .status(201)
        .json(
          new apiResponse(
            201,
            savedDiagnostic,
            "Diagnostic created successfully"
          )
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

// Get All Diagnostics
const getAllDiagnostics = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      category,
      isApprove = "Approved",
      latitude,
      longitude,
      radius = 5000,
      sortBy = "rating",
      isBloodBank,
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

    if (isBloodBank !== undefined) {
      match.isBloodBank = isBloodBank === "true";
    }
    // Optional category filter (if categories are used in Diagnostic schema)
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
          from: "categories", // if you want to lookup categories
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
    const totalDiagnostics = await Diagnostic.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalDiagnostics[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
      );
    }

    const diagnostics = await Diagnostic.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          diagnostics,
          totalDiagnostics: total,
          totalPages: Math.ceil(total / parsedLimit),
          currentPage: parsedPage,
        },
        "Diagnostics fetched successfully"
      )
    );
  } catch (error) {
    console.error(error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get Diagnostic By ID
const getDiagnosticById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const diagnostic = await Diagnostic.findById(id).populate(
    "reviews.user",
    "name email profilepic"
  );
  if (!diagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, diagnostic, "Diagnostic fetched successfully"));
});

// Update Diagnostic
const updateDiagnostic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const diagnostic = await Diagnostic.findById(id);
  const user = await User.findById(diagnostic?.userId);

  if (!diagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  // Handle GeoJSON update from latitude and longitude
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
      comment = "Congratulations! Your account has been successfully approved.";
      user.upgradeAccountApproveStatus = true;

      await user.save();
      await createNotifications({
        title,
        comment,
        userId: diagnostic?.userId,
        fcmToken: diagnostic?.fcmToken,
        screen: "Home",
      });
    } else {
      comment =
        "Unfortunately, your account upgrade request has been rejected. Please review and try again.";
    }
  }

  // Optional: Remove fields you don't want to allow updates for
  const restrictedFields = ["_id", "userId", "createdAt", "updatedAt"];
  restrictedFields.forEach((field) => delete updateData[field]);

  // Update only fields that exist in the schema
  Object.keys(updateData).forEach((key) => {
    diagnostic[key] = updateData[key];
  });

  const updatedDiagnostic = await diagnostic.save();
  res
    .status(200)
    .json(
      new apiResponse(200, updatedDiagnostic, "Diagnostic updated successfully")
    );
});

// Delete Diagnostic
const deleteDiagnostic = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const getData = await Diagnostic.findById(id);
  if (!getData) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  await createNotifications({
    title: `Your Upgraded Account Has Been Deleted`,
    comment: `Your upgraded account has been deleted  `,
    userId: getData?.userId,
    fcmToken: getData?.fcmToken,
    screen: "Home",
  });

  await Diagnostic.findByIdAndDelete(id);
  if (getData?.userId) {
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
        "Diagnostic and linked user deleted successfully"
      )
    );
});

// Add Review
const addReviewToDiagnostic = asyncHandler(async (req, res) => {
  const { id: diagnosticId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  if (!rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Rating must be between 1 and 5"));
  }

  const diagnostic = await Diagnostic.findById(diagnosticId);
  if (!diagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  const alreadyReviewed = diagnostic.reviews.find(
    (r) => r.user.toString() === userId.toString()
  );
  if (alreadyReviewed) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "You already reviewed this diagnostic"));
  }

  diagnostic.reviews.push({ user: userId, rating, comment });
  diagnostic.averageRating = calculateAverageRating(diagnostic.reviews);
  await diagnostic.save();

  res
    .status(201)
    .json(
      new apiResponse(201, diagnostic.reviews, "Review added successfully")
    );
});

// Update Review
const updateDiagnosticReview = asyncHandler(async (req, res) => {
  const { diagnosticId, reviewId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  const diagnostic = await Diagnostic.findById(diagnosticId);
  if (!diagnostic)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));

  const review = diagnostic.reviews.id(reviewId);
  if (!review)
    return res.status(404).json(new apiResponse(404, null, "Review not found"));

  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to update this review"));
  }

  if (rating) review.rating = rating;
  if (comment) review.comment = comment;

  diagnostic.averageRating = calculateAverageRating(diagnostic.reviews);
  await diagnostic.save();

  res
    .status(200)
    .json(
      new apiResponse(200, diagnostic.reviews, "Review updated successfully")
    );
});

// Delete Review
const deleteDiagnosticReview = asyncHandler(async (req, res) => {
  const { diagnosticId, reviewId } = req.params;
  const userId = req.user._id;

  const diagnostic = await Diagnostic.findById(diagnosticId);
  if (!diagnostic)
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));

  const review = diagnostic.reviews.id(reviewId);
  if (!review)
    return res.status(404).json(new apiResponse(404, null, "Review not found"));

  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to delete this review"));
  }

  review.deleteOne();
  diagnostic.averageRating = calculateAverageRating(diagnostic.reviews);
  await diagnostic.save();

  res
    .status(200)
    .json(
      new apiResponse(200, diagnostic.reviews, "Review deleted successfully")
    );
});

// Add BloodBank Entry
const addBloodBank = asyncHandler(async (req, res) => {
  const { id: diagnosticId } = req.params;
  const { bloodGroup, prbc, ffp, rdp, wp, platelets, status } = req.body;

  const diagnostic = await Diagnostic.findById(diagnosticId);
  if (!diagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  const newBloodBankEntry = {
    bloodGroup,
    prbc,
    ffp,
    rdp,
    wp,
    platelets,
    status,
  };

  diagnostic.bloodBank.push(newBloodBankEntry);
  await diagnostic.save();

  res
    .status(201)
    .json(
      new apiResponse(
        201,
        diagnostic.bloodBank,
        "Blood bank entry added successfully"
      )
    );
});

// Update BloodBank Entry
const updateBloodBank = asyncHandler(async (req, res) => {
  const { diagnosticId, bloodBankId } = req.params;
  const { bloodGroup, prbc, ffp, rdp, wp, platelets, status } = req.body;

  const diagnostic = await Diagnostic.findById(diagnosticId);
  if (!diagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  const bloodBank = diagnostic.bloodBank.id(bloodBankId);
  if (!bloodBank) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Blood bank entry not found"));
  }

  // ✅ Update fields
  if (bloodGroup !== undefined) bloodBank.bloodGroup = bloodGroup;
  if (prbc !== undefined) bloodBank.prbc = prbc;
  if (ffp !== undefined) bloodBank.ffp = ffp;
  if (rdp !== undefined) bloodBank.rdp = rdp;
  if (wp !== undefined) bloodBank.wp = wp;
  if (platelets !== undefined) bloodBank.platelets = platelets;
  if (status !== undefined) bloodBank.status = status;

  // ✅ Tell Mongoose that a nested array was modified
  diagnostic.markModified("bloodBank");

  await diagnostic.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        diagnostic.bloodBank,
        "Blood bank entry updated successfully"
      )
    );
});

// Delete BloodBank Entry
const deleteBloodBank = asyncHandler(async (req, res) => {
  const { diagnosticId, bloodBankId } = req.params;

  const diagnostic = await Diagnostic.findById(diagnosticId);
  if (!diagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  const bloodBank = diagnostic.bloodBank.id(bloodBankId);
  if (!bloodBank) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Blood bank entry not found"));
  }

  bloodBank.deleteOne(); // remove subdocument
  await diagnostic.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        diagnostic.bloodBank,
        "Blood bank entry deleted successfully"
      )
    );
});

// dashboard

const getDiagnosticDashboard = asyncHandler(async (req, res) => {
  const { diagnosticId } = req.params;

  if (!diagnosticId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Diagnostic ID is required"));
  }

  const diagnostic = await Diagnostic.findById(diagnosticId);

  if (!diagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  // Total Appointments
  const totalAppointments = await DiagnosticAppointment.countDocuments({
    diagnostic: diagnosticId,
    diagnosticDelete: false,
  });

  // Appointments grouped by status
  const appointments = await DiagnosticAppointment.find({
    diagnostic: diagnosticId,
    diagnosticDelete: false,
  })
    .populate(
      "referBy",
      "fullName email phone gender address experience profilepic"
    )
    .populate("patient", "name email phone gender profilepic")
    .populate("diagnostic", "name email phone gender profilepic")
    .sort({ createdAt: -1 });

  const appointmentsByStatus = {
    Pending: [],
    Confirmed: [],
    Completed: [],
    Cancelled: [],
    Rescheduled: [],
  };

  const serviceTypeCounts = {
    services: {},
    packages: {},
  };

  appointments.forEach((app) => {
    if (appointmentsByStatus[app.status]) {
      appointmentsByStatus[app.status].push(app);
    } else {
      appointmentsByStatus[app.status] = [app];
    }

    // Count services
    app.service?.forEach((srv) => {
      if (srv?.name) {
        serviceTypeCounts.services[srv.name] =
          (serviceTypeCounts.services[srv.name] || 0) + 1;
      }
    });

    // Count packages
    app.packages?.forEach((pkg) => {
      if (pkg?.name) {
        serviceTypeCounts.packages[pkg.name] =
          (serviceTypeCounts.packages[pkg.name] || 0) + 1;
      }
    });
  });

  // Unique patients count
  const uniquePatients = await DiagnosticAppointment.distinct("patient", {
    diagnostic: diagnosticId,
  });

  const diagnosticDetails = {
    name: diagnostic.name,
    phone: diagnostic.phone,
    address: diagnostic.address,
    profileImage: diagnostic.profileImage,
    averageRating: diagnostic.averageRating,
    email: diagnostic.email,
    isBloodBank: diagnostic.isBloodBank,
    storeTiming: diagnostic.storeTiming,
    description: diagnostic.description,
  };

  return res.status(200).json(
    new apiResponse(
      200,
      {
        diagnosticDetails,
        totalAppointments,
        totalPatients: uniquePatients.length,
        appointmentsByStatus,
        serviceTypeCounts,
        recentAppointments: appointments.slice(0, 10),
      },
      "Diagnostic dashboard data fetched successfully"
    )
  );
});

export {
  addBloodBank,
  updateBloodBank,
  deleteBloodBank,
  createDiagnostic,
  regenerateAvailabilityOfDiagnostic,
  regenerateAvailability,
  registerDiagnostic,
  getAllDiagnostics,
  getDiagnosticById,
  updateDiagnostic,
  deleteDiagnostic,
  addReviewToDiagnostic,
  updateDiagnosticReview,
  deleteDiagnosticReview,
  getDiagnosticDashboard,
};
