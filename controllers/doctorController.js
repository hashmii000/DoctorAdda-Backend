import Doctor from "../models/Doctor.modal.js";
import Category from "../models/Category.modal.js";

import User from "../models/User.modal.js";
import Appointment from "../models/appointment.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";
import { calculateAverageRating } from "../utils/helper.js";

import moment from "moment";

import { createNotifications } from "./notificationController.js";

export const generateAvailability = (
  startTime,
  endTime,
  duration,
  days = 2
) => {
  const availability = [];

  for (let i = 0; i < days; i++) {
    const date = moment().add(i, "days").startOf("day"); // e.g., 2025-05-13
    const slots = [];

    let slotStart = moment(
      `${date.format("YYYY-MM-DD")} ${startTime}`,
      "YYYY-MM-DD HH:mm"
    );
    const slotEnd = moment(
      `${date.format("YYYY-MM-DD")} ${endTime}`,
      "YYYY-MM-DD HH:mm"
    );

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

  for (let i = 0; i < days; i++) {
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

const registerDoctors = asyncHandler(async (req, res) => {
  const {
    phone,
    fullName,
    isSurgeon,
    onlineBooking,
    documents,
    animalTreated,
    hideNumber,
    email,
    profileImages,
    fcmToken,
    goldMedalist,
    gender,
    dob,
    profilepic,
    experience,
    documentNumber,
    documentImage,
    about,
    education,
    category,
    accountType = "Doctor",
    hospital,
    veterinaryDoctorType = [],
    serviceType = [],
    veterinaryserviceType = [],
    clinics,
    screen="Home"
  } = req.body;

  const { id } = req.params;

  // Basic validations
  if (
    !phone ||
    !fullName ||
    !email ||
    !Array.isArray(clinics) ||
    clinics.length === 0
  ) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Missing required fields or clinics data.")
      );
  }

  // Validate category
  const categoryName = await Category.findById(category);
  if (!categoryName) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid category ID."));
  }

  if (categoryName?.name === "Veterinary") {
    if (
      !Array.isArray(veterinaryDoctorType) ||
      veterinaryDoctorType.length === 0
    ) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "Veterinary doctor type is required.")
        );
    }
  }

  // Validate clinics
  const processedClinics = [];
  for (let clinic of clinics) {
    const {
      clinicName,
      clinicAddress,
      consultationFee,
      location,
      startTime,
      endTime,
      duration = "30",
      videoStartTime,
      videoEndTime,
      videoDuration = "30",
    } = clinic;

    if (
      !clinicName ||
      !clinicAddress ||
      !location ||
      !Array.isArray(location.coordinates)
    ) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Invalid clinic information or coordinates."
          )
        );
    }

    const [lng, lat] = location.coordinates;
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid clinic coordinates."));
    }

    // Availability
    let availability = [];
    let videoAvailability = [];

    if (categoryName?.name === "Veterinary") {
      if (startTime && endTime) {
        availability = generateAvailability(startTime, endTime, duration);
      }
    } else {
      if (startTime && endTime) {
        availability = generateAvailability(startTime, endTime, duration);
      }
      if (videoStartTime && videoEndTime) {
        videoAvailability = generateAvailability(
          videoStartTime,
          videoEndTime,
          videoDuration
        );
      }
    }

    processedClinics.push({
      clinicName,
      clinicAddress,
      consultationFee,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      startTime,
      endTime,
      duration,
      videoStartTime,
      videoEndTime,
      videoDuration,
      availability,
      videoAvailability,
    });
  }

  try {
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "User not found."));
    }

    const existingDoctor = await Doctor.findOne({ phone });

    if (existingDoctor) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "Phone number is already registered.")
        );
    }

    await createNotifications({
      title: "Account Upgrade Submitted",
      comment:
        "Your account upgrade request has been received and is under review.",
      userId: existingUser._id,
      fcmToken: existingUser?.fcmToken,
      screen:screen
    });

    const doctor = new Doctor({
      phone,
      fullName,
      gender,
      accountType,
      isSurgeon,
      onlineBooking,
      documents,
      animalTreated,
      dob,
      email,
      fcmToken,
      goldMedalist,
      profilepic,
      experience,
      profileImages,
      about,
      documentNumber,
      hideNumber,
      documentImage,
      education,
      category,
      hospital,
      userId: existingUser._id,
      clinics: processedClinics,
      veterinaryDoctorType,
      serviceType,
      veterinaryserviceType,
    });

    const savedDoctor = await doctor.save();

    existingUser.upgradeAccountId = savedDoctor._id;
    existingUser.upgradeAccountType = savedDoctor.accountType;
    await existingUser.save();

    return res
      .status(201)
      .json(new apiResponse(201, savedDoctor, "Doctor created successfully."));
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const addClinic = asyncHandler(async (req, res) => {
  try {
    const {
      doctorId,
      clinicName,
      clinicAddress,
      consultationFee,
      location,
      startTime,
      endTime,
      duration = "30",
      videoStartTime,
      videoEndTime,
      videoDuration = "30",
    } = req.body;

    // Validate doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Validate required fields
    if (!clinicName || !clinicAddress || !location?.coordinates) {
      return res.status(400).json({ message: "Missing required clinic data" });
    }

    const [lng, lat] = location.coordinates;
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({ message: "Invalid clinic coordinates" });
    }

    // Generate availability if times provided
    let availability = [];
    let videoAvailability = [];

    if (startTime && endTime) {
      availability = generateAvailability(startTime, endTime, duration);
    }

    if (videoStartTime && videoEndTime) {
      videoAvailability = generateAvailability(
        videoStartTime,
        videoEndTime,
        videoDuration
      );
    }

    // Build clinic object
    const newClinic = {
      clinicName,
      clinicAddress,
      consultationFee,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      startTime,
      endTime,
      duration,
      videoStartTime,
      videoEndTime,
      videoDuration,
      availability,
      videoAvailability,
    };

    // Add clinic and save
    doctor.clinics.push(newClinic);
    await doctor.save();

    return res.status(201).json({
      message: "Clinic added successfully",
      clinic: newClinic,
    });
  } catch (error) {
    console.error("Add Clinic Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

const updateClinicDetails = asyncHandler(async (req, res) => {
  const { doctorId, clinicId } = req.params;
  const {
    clinicName,
    clinicAddress,
    consultationFee,
    location,
    startTime,
    endTime,
    duration,
    videoStartTime,
    videoEndTime,
    videoDuration,
    availability,
    videoAvailability,
  } = req.body;

  // Validate inputs
  if (!doctorId || !clinicId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing doctorId or clinicId"));
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  const clinic = doctor.clinics.id(clinicId);
  if (!clinic) {
    return res.status(404).json(new apiResponse(404, null, "Clinic not found"));
  }

  // Update provided fields
  if (clinicName) clinic.clinicName = clinicName;
  if (clinicAddress) clinic.clinicAddress = clinicAddress;
  if (consultationFee) clinic.consultationFee = consultationFee;

  if (location?.coordinates?.length === 2) {
    const [lng, lat] = location.coordinates;
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid clinic coordinates"));
    }

    clinic.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }

  // Handle timing and availability regeneration
  if (startTime) clinic.startTime = startTime;
  if (endTime) clinic.endTime = endTime;
  if (duration) clinic.duration = duration;
  if (availability) clinic.availability = availability;

  // if (startTime && endTime) {
  //   clinic.availability = generateAvailability(startTime, endTime, duration || clinic.duration);
  // }

  if (videoStartTime) clinic.videoStartTime = videoStartTime;
  if (videoEndTime) clinic.videoEndTime = videoEndTime;
  if (videoDuration) clinic.videoDuration = videoDuration;
  if (videoAvailability) clinic.videoAvailability = videoAvailability;

  // if (videoStartTime && videoEndTime) {
  //   clinic.videoAvailability = generateAvailability(
  //     videoStartTime,
  //     videoEndTime,
  //     videoDuration || clinic.videoDuration
  //   );
  // }

  await doctor.save();

  return res
    .status(200)
    .json(new apiResponse(200, clinic, "Clinic details updated successfully"));
});

// change  isAvailable status

const updateSlot = async (req, res) => {
  try {
    const { doctorId, clinicId, slotDate, isAvailable } = req.body;

    // Validate request body
    if (!doctorId || !clinicId || !slotDate || isAvailable === undefined) {
      return res
        .status(400)
        .json({ message: "Missing required fields in request body" });
    }

    // Find the doctor by ID
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Find the clinic by ID inside the doctor's clinics
    const clinic = doctor.clinics.id(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    // Find the availability array for the provided slot date
    const date = new Date(slotDate);
    const availability = clinic.availability.find(
      (item) =>
        item.date.toISOString().split("T")[0] ===
        date.toISOString().split("T")[0]
    );
    if (!availability) {
      return res
        .status(404)
        .json({ message: "Availability for this date not found" });
    }

    // Update the availability's isAvailable value for the entire day
    availability.isAvailable = isAvailable;

    // Save the updated doctor document
    await doctor.save();

    res
      .status(200)
      .json({ message: "Availability updated successfully", doctor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const regenerateAvailabilityOfClinic = asyncHandler(async (req, res) => {
  const { doctorId, clinicId, days } = req.body;

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    const clinic = doctor.clinics.id(clinicId);
    if (!clinic) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Clinic not found"));
    }

    if (clinic.startTime && clinic.endTime) {
      if (clinic.availability.length === 0) {
        clinic.availability = generateAvailability(
          clinic.startTime,
          clinic.endTime,
          clinic.duration || "30",
          days
        );
      } else {
        const newAvailability = generateAvailabilityafterDate(
          clinic.startTime,
          clinic.endTime,
          clinic?.availability?.[clinic.availability.length - 1]?.date,
          clinic.duration || "30",
          days
        );
        const existingAvailability = Array.isArray(clinic.availability)
          ? clinic.availability
          : [];

        clinic.availability = [...existingAvailability, ...newAvailability];
      }
    }

    if (clinic.videoStartTime && clinic.videoEndTime) {
      if (clinic.videoAvailability.length === 0) {
        clinic.videoAvailability = generateAvailability(
          clinic.videoStartTime,
          clinic.videoEndTime,
          clinic.videoDuration || "30",
          days
        );
      } else {
        const newAvailability = generateAvailabilityafterDate(
          clinic.videoStartTime,
          clinic.videoEndTime,
          clinic?.videoAvailability?.[clinic.videoAvailability.length - 1]
            ?.date,
          clinic.videoDuration || "30",
          days
        );
        const existingAvailability = Array.isArray(clinic.videoAvailability)
          ? clinic.videoAvailability
          : [];

        clinic.videoAvailability = [
          ...existingAvailability,
          ...newAvailability,
        ];
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
  const { doctorId } = req.body;

  try {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    let updated = false;
    const today = moment().startOf("day");

    for (const clinic of doctor.clinics) {
      const lastClinicAvailability =
        clinic.availability?.[clinic.availability.length - 1]?.date;
      const lastVideoAvailability =
        clinic.videoAvailability?.[clinic.videoAvailability.length - 1]?.date;

      const needsClinicUpdate =
        !lastClinicAvailability ||
        moment(lastClinicAvailability).isBefore(today);
      const needsVideoUpdate =
        !lastVideoAvailability || moment(lastVideoAvailability).isBefore(today);

      if (needsClinicUpdate && clinic.startTime && clinic.endTime) {
        clinic.availability = generateAvailability(
          clinic.startTime,
          clinic.endTime,
          clinic.duration || "30"
        );
        updated = true;
      }

      if (needsVideoUpdate && clinic.videoStartTime && clinic.videoEndTime) {
        clinic.videoAvailability = generateAvailability(
          clinic.videoStartTime,
          clinic.videoEndTime,
          clinic.videoDuration || "30"
        );
        updated = true;
      }
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

const getAllDoctors = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      hospital,
      category,
      serviceType,
      veterinaryserviceType,
      veterinaryDoctorType,
      latitude,
      longitude,
      isApprove = "Approved",
      radius = 5000,
      sortBy = "rating",
      maxFee,
      goldMedalist,
      fromDate,
      toDate,
    } = req.query;

    const pipeline = [];

    // Parse numbers
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const radiusInKm = parseFloat(radius) / 1000;
    const feeLimit = parseFloat(maxFee);

    // Geo filter with optional maxFee
    if (latitude && longitude) {
      pipeline.push({
        $addFields: {
          clinics: {
            $filter: {
              input: "$clinics",
              as: "clinic",
              cond: {
                $and: [
                  {
                    $lte: [
                      {
                        $let: {
                          vars: {
                            lat1: {
                              $arrayElemAt: [
                                "$$clinic.location.coordinates",
                                1,
                              ],
                            },
                            lon1: {
                              $arrayElemAt: [
                                "$$clinic.location.coordinates",
                                0,
                              ],
                            },
                          },
                          in: {
                            $multiply: [
                              6371,
                              {
                                $acos: {
                                  $add: [
                                    {
                                      $multiply: [
                                        {
                                          $cos: { $degreesToRadians: "$$lat1" },
                                        },
                                        { $cos: { $degreesToRadians: lat } },
                                        {
                                          $cos: {
                                            $subtract: [
                                              { $degreesToRadians: lng },
                                              { $degreesToRadians: "$$lon1" },
                                            ],
                                          },
                                        },
                                      ],
                                    },
                                    {
                                      $multiply: [
                                        {
                                          $sin: { $degreesToRadians: "$$lat1" },
                                        },
                                        { $sin: { $degreesToRadians: lat } },
                                      ],
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                      },
                      radiusInKm,
                    ],
                  },
                  ...(maxFee
                    ? [
                        {
                          $lte: ["$$clinic.consultationFee", feeLimit],
                        },
                      ]
                    : []),
                ],
              },
            },
          },
        },
      });

      pipeline.push({
        $match: {
          "clinics.0": { $exists: true },
        },
      });
    } else if (maxFee) {
      // Filter by consultationFee only if geo not provided
      pipeline.push({
        $addFields: {
          clinics: {
            $filter: {
              input: "$clinics",
              as: "clinic",
              cond: {
                $lte: ["$$clinic.consultationFee", feeLimit],
              },
            },
          },
        },
      });

      pipeline.push({
        $match: {
          "clinics.0": { $exists: true },
        },
      });
    }

    // Base filters
    const match = {};
    if (isApprove) match.isApprove = { $regex: isApprove, $options: "i" };
    if (hospital) match.hospital = { $regex: hospital, $options: "i" };
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      match.category = new mongoose.Types.ObjectId(category);
    }

    if (goldMedalist == "true") {
      match.goldMedalist = true;
    }

    if (serviceType) {
      const types = Array.isArray(serviceType)
        ? serviceType
        : serviceType.split(",").map((t) => t.trim());
      match.serviceType = { $in: types };
    }

    if (veterinaryserviceType) {
      const vetTypes = Array.isArray(veterinaryserviceType)
        ? veterinaryserviceType
        : veterinaryserviceType.split(",").map((t) => t.trim());
      match.veterinaryserviceType = { $in: vetTypes };
    }
    if (veterinaryDoctorType) {
      const vetTypes = Array.isArray(veterinaryDoctorType)
        ? veterinaryDoctorType
        : veterinaryDoctorType.split(",").map((t) => t.trim());
      match.veterinaryDoctorType = { $in: vetTypes };
    }

    if (fromDate && toDate) {
      match.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    } else if (fromDate) {
      match.createdAt = { $gte: new Date(fromDate) };
    } else if (toDate) {
      match.createdAt = { $lte: new Date(toDate) };
    }

    pipeline.push({ $match: match });

    // Lookup Category
    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Global Search
    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word.replace(/’/g, "'"), "i"));

      const orConditions = words.flatMap((regex) => [
        { fullName: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
        { hospital: { $regex: regex } },
        { "category.name": { $regex: regex } },
        { education: { $regex: regex } },
        { about: { $regex: regex } },
        { experience: { $regex: regex } },
        { isApprove: { $regex: regex } },
      ]);

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sorting
    if (sortBy === "rating") {
      pipeline.push({ $sort: { averageRating: -1 } });
    } else if (sortBy === "recent") {
      pipeline.push({ $sort: { createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { _id: -1 } });
    }

    // Count total
    const totalDoctors = await Doctor.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalDoctors[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (page - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    // Final fetch
    const doctors = await Doctor.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          doctors,
          totalDoctors: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Doctors fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllAvilableDoctors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    isAvilable = "true",
    isApprove = "Approved",
    isSurgeon = "false",
    hospital,
    category,
    serviceType,
    veterinaryserviceType,
  } = req.query;

  const match = {};

  // 🔍 Boolean filter: isAvilable
  if (isAvilable === "true") {
    match.isAvilable = true;
  }
  if (isSurgeon === "true") {
    match.isSurgeon = true;
  }

  // 🔍 Enum filter: isApprove
  if (isApprove) {
    match.isApprove = isApprove; // e.g., "Approved", "Reject", etc.
  }

  // 🔍 Regex filter: hospital name
  if (hospital) {
    match.hospital = { $regex: hospital, $options: "i" };
  }

  // 🔍 Category filter: ObjectId
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    match.category = new mongoose.Types.ObjectId(category);
  }

  // 🔍 Array filter: serviceType
  if (serviceType) {
    const types = Array.isArray(serviceType)
      ? serviceType
      : serviceType.split(",").map((t) => t.trim());
    match.serviceType = { $in: types };
  }

  // 🔍 Array filter: veterinaryserviceType
  if (veterinaryserviceType) {
    const vetTypes = Array.isArray(veterinaryserviceType)
      ? veterinaryserviceType
      : veterinaryserviceType.split(",").map((t) => t.trim());
    match.veterinaryserviceType = { $in: vetTypes };
  }

  // 🔍 Search by doctor name (optional)
  if (search) {
    match.name = { $regex: search, $options: "i" };
  }

  const total = await Doctor.countDocuments(match);

  const doctors = await Doctor.find(match)
    .populate("category", "categoryName")
    .populate("hospital", "hospitalName")
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        doctors,
      },
      "Doctors fetched successfully"
    )
  );
});

const getDoctorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const doctor = await Doctor.findById(id)
      .populate("category", "name")
      .populate("reviews.user", "name email profilepic");
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }
    res
      .status(200)
      .json(new apiResponse(200, doctor, "Doctor fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const doctor = await Doctor.findById(id);
    const user = await User.findById(doctor?.userId);

    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
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

    if (updateData?.isApprove) {
      let title = `Your Account ${updateData?.isApprove}`;
      let comment = "";
      if (updateData?.isApprove == "Approved") {
        comment =
          "Congratulations! Your account has been successfully approved.";
        user.upgradeAccountApproveStatus = true;

        await user.save();
      } else {
        comment =
          "Unfortunately, your account upgrade request has been rejected. Please review and try again.";
      }
      await createNotifications({
        title,
        comment,
        userId: doctor?.userId,
        fcmToken: doctor?.fcmToken,
        screen:"Home"
      });
    }

    // Optional: Remove fields you don't want to allow updates for
    const restrictedFields = ["_id", "userId", "createdAt", "updatedAt"];
    restrictedFields.forEach((field) => delete updateData[field]);

    // Update only fields that exist in the schema
    Object.keys(updateData).forEach((key) => {
      doctor[key] = updateData[key];
    });

    const updatedDoctor = await doctor.save();

    res
      .status(200)
      .json(new apiResponse(200, updatedDoctor, "Doctor updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const getData = await Doctor.findById(id);

    if (!getData) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    await createNotifications({
      title: `Your Upgraded Account Has Been Deleted`,
      comment: `Your upgraded account has been deleted`,
      userId: getData?.userId,
      fcmToken: getData?.fcmToken,
      screen:"Home"
    });
    await Doctor.findByIdAndDelete(id);
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
          "Doctor and linked user deleted successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// dashboard

const getDoctorDashboard = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  if (!doctorId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Doctor ID is required"));
  }

  // Validate Doctor
  const doctor = await Doctor.findById(doctorId).populate("category", "name");

  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  // Total Clinics
  const totalClinics = doctor.clinics?.length || 0;

  // Total Appointments
  const totalAppointments = await Appointment.countDocuments({
    doctor: doctorId,
    doctorDelete: false,
  });

  const inClinicAppointmentsCount = await Appointment.countDocuments({
    doctor: doctorId,
    doctorDelete: false,
    serviceType: "In-clinic",
  });

  // Get all appointments for this doctor
  // const appointments = await Appointment.find({ doctor: doctorId }).sort({
  //   createdAt: -1,
  // });
  const appointments = await Appointment.find({
    doctor: doctorId,
    doctorDelete: false,
  })
    .populate("doctor", "fullName isAvilable phone gender profilepic")
    .populate("patient", "name email phone gender profilepic")
    .sort({ createdAt: -1 });

  const serviceTypeCounts = {};

  appointments.forEach((app) => {
    const type = app.serviceType;
    if (serviceTypeCounts[type]) {
      serviceTypeCounts[type]++;
    } else {
      serviceTypeCounts[type] = 1;
    }
  });

  // Group appointments by status
  const appointmentsByStatus = {
    Pending: [],
    Confirmed: [],
    Completed: [],
    Cancelled: [],
    Rescheduled: [],
  };

  appointments.forEach((app) => {
    if (appointmentsByStatus[app.status]) {
      appointmentsByStatus[app.status].push(app);
    } else {
      appointmentsByStatus[app.status] = [app];
    }
  });

  const uniquePatientIds = await Appointment.distinct("patient", {
    doctor: doctorId,
    doctorDelete: false,
  });

  const totalPatients = uniquePatientIds.length;

  const doctorDetails = {
    name: doctor?.fullName,
    phone: doctor?.phone,
    gender: doctor?.gender,
    dob: doctor?.dob,
    isAvilable: doctor?.isAvilable,
    category: doctor?.category,
    profilepic: doctor?.profilepic,
    experience: doctor?.experience,
    averageRating: doctor?.averageRating,
  };

  return res.status(200).json(
    new apiResponse(
      200,
      {
        doctorDetails,
        inClinicAppointmentsCount,
        totalClinics,
        totalAppointments,
        totalPatients,
        serviceTypeCounts,
        appointmentsByStatus,
      },
      "Doctor dashboard data fetched successfully"
    )
  );
});

const registerDoctor = asyncHandler(async (req, res) => {
  const {
    phone,
    fullName,
    gender,
    accountType = "Doctor",
    dob,
    email,
    latitude,
    longitude,
    profilepic,
    experience,
    clinicName,
    serviceType,
    consultationFee,
    address,
    about,
    education,
    category,
    hospital,
  } = req.body;

  if (!phone || !fullName || !email || !latitude || !longitude) {
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
    const existingDoctor = await Doctor.findOne({ phone });
    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is already registered"));
    }

    if (existingUser) {
      if (existingUser.isNew) {
        const doctor = new Doctor({
          phone,
          fullName,
          gender,
          accountType,
          dob,
          email,

          location: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          userId: existingUser?._id,
        });

        const savedDoctor = await doctor.save();

        existingUser.accountType = accountType;
        existingUser.accountId = savedDoctor._id;
        existingUser.isNew = false;
        await existingUser.save();

        res
          .status(201)
          .json(
            new apiResponse(201, savedDoctor, "Doctor created successfully")
          );
      } else {
        return res
          .status(400)
          .json(
            new apiResponse(400, null, "User already exists with this number")
          );
      }
    } else {
      return res
        .status(400)
        .json(new apiResponse(400, null, "User not found."));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Review

const addReviewToDoctor = asyncHandler(async (req, res) => {
  const { id: doctorId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id; // assuming you're using auth middleware

  if (!rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Rating must be between 1 and 5"));
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  // Check if user already reviewed
  const alreadyReviewed = doctor.reviews.find(
    (r) => r.user.toString() === userId.toString()
  );

  if (alreadyReviewed) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "You have already reviewed this doctor")
      );
  }

  doctor.reviews.push({ user: userId, rating, comment });
  doctor.averageRating = calculateAverageRating(doctor.reviews);
  await doctor.save();

  res
    .status(201)
    .json(new apiResponse(201, doctor.reviews, "Review added successfully"));
});

const updateDoctorReview = asyncHandler(async (req, res) => {
  const { doctorId, reviewId } = req.params;

  const { rating, comment } = req.body;
  const userId = req.user._id; // authenticated user

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  const review = doctor.reviews.id(reviewId);

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

  doctor.averageRating = calculateAverageRating(doctor.reviews);
  await doctor.save();

  res
    .status(200)
    .json(new apiResponse(200, doctor.reviews, "Review updated successfully"));
});

const deleteDoctorReview = asyncHandler(async (req, res) => {
  const { doctorId, reviewId } = req.params;
  const userId = req.user._id;

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  const review = doctor.reviews.id(reviewId);
  if (!review) {
    return res.status(404).json(new apiResponse(404, null, "Review not found"));
  }

  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to delete this review"));
  }

  review.deleteOne(); // remove the review
  doctor.averageRating = calculateAverageRating(doctor.reviews);
  await doctor.save();

  res
    .status(200)
    .json(new apiResponse(200, doctor.reviews, "Review deleted successfully"));
});

export {
  registerDoctor,
  registerDoctors,
  addClinic,
  updateSlot,
  updateClinicDetails,
  regenerateAvailability,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getDoctorDashboard,
  addReviewToDoctor,
  updateDoctorReview,
  deleteDoctorReview,
  regenerateAvailabilityOfClinic,
  getAllAvilableDoctors,
};
