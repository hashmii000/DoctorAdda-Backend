import Hospital from "../models/Hospital.modal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import Category from "../models/Category.modal.js";
import HealthCard from "../models/HealthCard.modal.js";
import User from "../models/User.modal.js";
import mongoose from "mongoose";
import { calculateAverageRating } from "../utils/helper.js";
import HospitalAppointment from "../models/HospitalAppointment.modal.js";
import { createNotifications } from "./notificationController.js";
import {
  generateAvailability,
  generateAvailabilityafterDate,
} from "../utils/commanFun.js";
import moment from "moment";
// Register a new hospital
const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

const registerHospital = asyncHandler(async (req, res) => {
  const {
    name,
    hospitalType,
    yearOfEstablish,registrationNo,documents,
    address,
    fcmToken,
    profileImage,
    profileImages,
    latitude,
    longitude,
    facilities,
    doctors,
    reviews,
    averageRating,
    ownerDetails,
    phone,
    email,
    description,
    categories,
    healthCard,
    accountType = "Hospital",
    isApprove,
    registeredDoctor,
    screen="Home"
  } = req.body;

  const { id } = req.params;

  // Required field validation
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
    const existingHospital = await Hospital.findOne({ phone });
    const existingUser = await User.findById(id);

    if (existingHospital) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is already registered"));
    }

    const hospital = new Hospital({
      name,
      address,
      profileImage,
      fcmToken,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
      facilities,
       hospitalType,
    yearOfEstablish,
      doctors,
      reviews,
      averageRating,
      profileImages,
      ownerDetails,
      phone,
      email,
      description,registrationNo,documents,
      categories,
      healthCard,
      accountType,
      isApprove,
      userId: existingUser?._id,
      registeredDoctor,
    });

    const savedHospital = await hospital.save();

    existingUser.upgradeAccountId = savedHospital._id;
    existingUser.upgradeAccountType = savedHospital.accountType;
    await existingUser.save();

    await createNotifications({
      title: "Account Upgrade Successfuly",
      comment:
        "Your account upgrade request has been received and is currently under review.",
      userId: existingUser?._id,
      fcmToken: existingUser?.fcmToken,
      screen:screen
    });

    res
      .status(201)
      .json(
        new apiResponse(201, savedHospital, "Hospital registered successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const createHospital = asyncHandler(async (req, res) => {
  const {
    name,
    latitude,
    profileImages,
     hospitalType,
    yearOfEstablish,registrationNo,documents,
    fcmToken,
    longitude,
    phone,
    email,
    description,
    accountType,
    categories,
    healthCard,
  } = req.body;

  if (
    !name ||
    !latitude ||
    !longitude ||
    !accountType ||
    !phone ||
    !email ||
    categories.length === 0
  ) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Name, location, contactInfo, and categories are required."
        )
      );
  }

  try {
    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      if (existingUser.isNew) {
        const hospital = new Hospital({
          name,
          phone,
          email,
          description,
          accountType,
          profileImages,
          fcmToken,
           hospitalType,
    yearOfEstablish,
    registrationNo,documents,
          categories,
          healthCard,
          location: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          userId: existingUser?._id,
        });

        const savedHospital = await hospital.save();

        existingUser.accountType = accountType;
        existingUser.accountId = savedHospital._id;
        existingUser.isNew = false;
        await existingUser.save();

        res
          .status(201)
          .json(
            new apiResponse(201, savedHospital, "Hospital created successfully")
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

const getAllHospitals = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      category,
      healthcard,
      latitude,
      longitude,
      isApprove = "Approved",
      radius = 5000,
      sortBy = "rating",
      fromDate,
      toDate,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit)));
    const parsedRadius = Math.max(1, parseInt(radius));
    const parsedSortBy = ["rating", "recent"].includes(sortBy)
      ? sortBy
      : "rating";

    const match = {};

    // Approval filter
    if (isApprove) {
      match.isApprove = { $regex: isApprove, $options: "i" };
    }

    // Category filter
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      match.categories = new mongoose.Types.ObjectId(category);
    }

    // HealthCard filter
    if (healthcard && mongoose.Types.ObjectId.isValid(healthcard)) {
      match.healthCard = new mongoose.Types.ObjectId(healthcard);
    }

    // Geo filter
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

    // Aggregation pipeline
    let pipeline = [
      { $match: match },

      // Lookup categories
      {
        $lookup: {
          from: "categories",
          localField: "categories",
          foreignField: "_id",
          as: "categories",
        },
      },
      // Lookup health cards
      {
        $lookup: {
          from: "healthcards",
          localField: "healthCard",
          foreignField: "_id",
          as: "healthCard",
        },
      },
      // Lookup registeredDoctor details
      {
        $lookup: {
          from: "doctors",
          let: {
            doctorIds: {
              $map: {
                input: "$registeredDoctor",
                as: "doc",
                in: "$$doc.doctorId",
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$doctorIds"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                fullName: 1,
                phone: 1,
                gender: 1,
                email: 1,
                specialization: 1,
                experience: 1,
              },
            },
          ],
          as: "fetchedDoctorDetails",
        },
      },
    ];

    // Search
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
        { "categories.name": { $regex: regex } },
        { "facilities.name": { $regex: regex } },
        { "facilities.description": { $regex: regex } },
        { "doctors.name": { $regex: regex } },
        { "doctors.specialization": { $regex: regex } },
        { isApprove: { $regex: regex } },
      ]);

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sort
    if (parsedSortBy === "rating") {
      pipeline.push({ $sort: { averageRating: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Count total
    const totalCountAggregation = await Hospital.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalCountAggregation[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
      );
    }

    // Final result
    const hospitals = await Hospital.aggregate(pipeline);

    // Merge fetchedDoctorDetails into registeredDoctor
    hospitals.forEach((hospital) => {
      const doctorDetailsMap = new Map();
      hospital.fetchedDoctorDetails?.forEach((doc) => {
        doctorDetailsMap.set(doc._id.toString(), doc);
      });

      hospital.registeredDoctor = hospital.registeredDoctor.map((localDoc) => {
        const docId = localDoc.doctorId?.toString();
        const fetched = doctorDetailsMap.get(docId);

        return {
          doctorId: docId,
          fee: localDoc.fee,
          days: localDoc.days,
          availability: localDoc.availability,
          schedules: localDoc.schedules,
          status: localDoc.status || "active",
          ...fetched, // merge fetched doctor info
        };
      });

      delete hospital.fetchedDoctorDetails;
    });

    res.status(200).json(
      new apiResponse(
        200,
        {
          hospitals,
          totalHospitals: total,
          totalPages: Math.ceil(total / parsedLimit),
          currentPage: parsedPage,
        },
        "Hospitals fetched successfully"
      )
    );
  } catch (error) {
    console.error("Hospital Fetch Error:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getHospitalsNearMe = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude || !radius) {
      return res
        .status(400)
        .json({ error: "latitude, longitude and radius are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius); // Radius in kilometers

    // MongoDB expects the distance in meters for $maxDistance
    const maxDistanceInMeters = rad * 1000;

    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // Note: longitude comes first
          },
          $maxDistance: maxDistanceInMeters,
        },
      },
      isApprove: "Approved",
    });

    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals,
    });
  } catch (err) {
    console.error("Error fetching nearby hospitals:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get a hospital by ID
const getHospitalById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const hospital = await Hospital.findById(id)
      .populate("categories", "name")
      .populate("healthCard", "name ")
      .populate({
        path: "registeredDoctor.doctorId",
        select: "_id fullName phone gender experience category profilepic",
        populate: {
          path: "category",
          select: "name",
        },
      })
      .populate("reviews.user", "name email profilepic");

    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, hospital, "Hospital fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a hospital
const updateHospital = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (updateData.categories && updateData.categories.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "At least one category is required"));
  }

  try {
    const hospital = await Hospital.findById(id);
    const user = await User.findById(hospital?.userId);

    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found"));
    }

    // Ensure categories are valid
    if (updateData.categories) {
      const categoryExists = await Category.find({
        _id: { $in: updateData.categories },
      });
      if (categoryExists.length !== updateData.categories.length) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "One or more invalid categories"));
      }
    }
    if (updateData.healthCard) {
      const healthCardExists = await HealthCard.find({
        _id: { $in: updateData.healthCard },
      });
      if (healthCardExists.length !== updateData.healthCard.length) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "One or more invalid categories"));
      }
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
          userId: hospital?.userId,
          fcmToken: hospital?.fcmToken,
          screen:"Home"
        });
      } else {
        comment =
          "Unfortunately, your account upgrade request has been rejected. Please review and try again.";
      }
    }

    // Update hospital fields
    Object.keys(updateData).forEach((key) => {
      hospital[key] = updateData[key];
    });

    const updatedHospital = await hospital.save();
    res
      .status(200)
      .json(
        new apiResponse(200, updatedHospital, "Hospital updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteHospital = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const getData = await Hospital.findById(id);

    if (!getData) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found"));
    }

    await createNotifications({
      title: `Your Upgraded Account Has Been Deleted`,
      comment: `Your upgraded account has been deleted  `,
      userId: getData?.userId,
      fcmToken: getData?.fcmToken,
      screen:"Home"
    });

    await Hospital.findByIdAndDelete(id);
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
          "Hospital and linked user deleted successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// hospital doctor

const addDoctorToHospital = asyncHandler(async (req, res) => {
  const { id: hospitalId } = req.params;
  const {
    name,
    experience,
    specialization,
    fee,
    status,
    email,
    phone,
    days,
    availability,
    time,
    schedules,
  } = req.body;

  if (!name || !experience || !specialization || !time) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "All doctor fields are required."));
  }

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found."));
    }

    const newDoctor = {
      name,
      experience,
      specialization,
      fee,
      status,
      email,
      phone,
      days,
      availability,
      time,
      schedules,
    };

    hospital.doctors.push(newDoctor);
    await hospital.save();

    res
      .status(201)
      .json(
        new apiResponse(201, hospital.doctors, "Doctor added successfully.")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateDoctorInHospital = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const updateData = req.body;

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found."));
    }

    const doctor = hospital.doctors.id(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found."));
    }

    // Update doctor fields
    Object.keys(updateData).forEach((key) => {
      doctor[key] = updateData[key];
    });

    await hospital.save();
    res
      .status(200)
      .json(new apiResponse(200, doctor, "Doctor updated successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});
const updateDoctorInHospital1 = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const updateData = req.body;

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found."));
    }

    const doctor = hospital.registeredDoctor.id(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found."));
    }

    // Update doctor fields
    Object.keys(updateData).forEach((key) => {
      doctor[key] = updateData[key];
    });

    await hospital.save();
    res
      .status(200)
      .json(new apiResponse(200, doctor, "Doctor updated successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteDoctorFromHospital = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId } = req.params;

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found."));
    }

    const originalLength = hospital.doctors.length;
    hospital.doctors = hospital.doctors.filter(
      (doc) => doc._id.toString() !== doctorId
    );

    if (hospital.doctors.length === originalLength) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found."));
    }

    await hospital.save();

    res
      .status(200)
      .json(new apiResponse(200, null, "Doctor removed successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// doctor avilibility

const regenerateAvailabilityOfDoctor = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId, days } = req.body;

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found"));
    }

    const doctor = hospital.doctors.id(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    if (!Array.isArray(doctor.days) || doctor.days.length === 0) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "Doctor's working days are not defined")
        );
    }

    const validDayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const invalidDays = doctor.days.filter(
      (day) => !validDayNames.includes(day)
    );

    if (invalidDays.length > 0) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            `Invalid day(s) found: ${invalidDays.join(
              ", "
            )}. Days must be in format: ${validDayNames.join(", ")}`
          )
        );
    }

    // ✅ Get startTime and endTime from first schedule or default
    let startTime, endTime;
    const schedule = doctor.schedules?.[0];

    if (schedule?.startTime && schedule?.endTime) {
      (startTime = schedule.startTime), (endTime = schedule.endTime);
    } else {
      startTime = "09:00";
      endTime = "12:00";
    }
    // let startTime, endTime;
    // const schedule = doctor.schedules?.[0];

    // if (schedule?.startTime && schedule?.endTime) {
    //   startTime = moment(schedule.startTime, "HH:mm").format("hh:mm A");
    //   endTime = moment(schedule.endTime, "HH:mm").format("hh:mm A");
    // } else {
    //   startTime = "09:00";
    //   endTime = "12:00";
    // }

    // ✅ Use doctor's duration or default to 30 mins
    const duration = doctor.duration || "30";

    // ✅ Use doctor.days for filtering days like ["Monday", "Friday"]
    const validDays = doctor.days || [];

    // ✅ Regenerate availability
    if (
      !Array.isArray(doctor.availability) ||
      doctor.availability.length === 0
    ) {
      doctor.availability = generateAvailability(
        startTime,
        endTime,
        duration,
        validDays,
        days
      );
    } else {
      const lastDate =
        doctor.availability[doctor.availability.length - 1]?.date;

      const newAvailability = generateAvailabilityafterDate(
        startTime,
        endTime,
        lastDate,
        duration,
        validDays,
        days
      );

      doctor.availability = [...doctor.availability, ...newAvailability];
    }

    await hospital.save();

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

const regenerateAvailabilityOfDoctor1 = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId, days } = req.body;

  try {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found"));
    }

    const doctor = hospital.registeredDoctor.id(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    if (!Array.isArray(doctor.days) || doctor.days.length === 0) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "Doctor's working days are not defined")
        );
    }

    const validDayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const invalidDays = doctor.days.filter(
      (day) => !validDayNames.includes(day)
    );

    if (invalidDays.length > 0) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            `Invalid day(s) found: ${invalidDays.join(
              ", "
            )}. Days must be in format: ${validDayNames.join(", ")}`
          )
        );
    }

    // ✅ Get startTime and endTime from first schedule or default
    let startTime, endTime;
    const schedule = doctor.schedules?.[0];

    if (schedule?.startTime && schedule?.endTime) {
      startTime = schedule.startTime;
      endTime = schedule.endTime;
    } else {
      startTime = "09:00";
      endTime = "12:00";
    }

    // ✅ Use doctor's duration or default to 30 mins
    const duration = doctor.duration || "30";

    // ✅ Use doctor.days for filtering days like ["Monday", "Friday"]
    const validDays = doctor.days || [];

    // ✅ Regenerate availability
    if (
      !Array.isArray(doctor.availability) ||
      doctor.availability.length === 0
    ) {
      doctor.availability = generateAvailability(
        startTime,
        endTime,
        duration,
        validDays,
        days
      );
    } else {
      const lastDate =
        doctor.availability[doctor.availability.length - 1]?.date;

      const newAvailability = generateAvailabilityafterDate(
        startTime,
        endTime,
        lastDate,
        duration,
        validDays,
        days
      );

      doctor.availability = [...doctor.availability, ...newAvailability];
    }

    await hospital.save();

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

const addOrUpdateAvailability = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId } = req.params;
  const { availability } = req.body;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found"));
  }

  const doctor = hospital.doctors.id(doctorId);
  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  doctor.availability = availability;
  await hospital.save();

  res
    .status(200)
    .json(new apiResponse(200, doctor, "Doctor availability updated"));
});

const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId } = req.params;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found"));
  }

  const doctor = hospital.doctors.id(doctorId);
  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        doctor.availability || [],
        "Doctor availability fetched"
      )
    );
});

const updateSlotBooking = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId, date } = req.params;
  const { slotIndex, isBooked } = req.body;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found"));
  }

  const doctor = hospital.doctors.id(doctorId);
  if (!doctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  const availability = doctor.availability.find(
    (a) => new Date(a.date).toDateString() === new Date(date).toDateString()
  );

  if (!availability || !availability.slots[slotIndex]) {
    return res.status(404).json(new apiResponse(404, null, "Slot not found"));
  }

  availability.slots[slotIndex].isBooked = isBooked;
  await hospital.save();

  res
    .status(200)
    .json(new apiResponse(200, availability, "Slot status updated"));
});

// hospital registed doctor

const addRegisteredDoctor = asyncHandler(async (req, res) => {
  const { hospitalId } = req.params;
  const { doctorId,fee, days,availability,status, schedules } = req.body;

  if (!doctorId || !days || !schedules) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "All fields are required."));
  }

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found."));
  }

  // Prevent duplicate entry
  const alreadyExists = hospital.registeredDoctor.some(
    (doc) => doc.doctorId.toString() === doctorId.toString()
  );

  if (alreadyExists) {
    return res
      .status(409)
      .json(new apiResponse(409, null, "Doctor already registered."));
  }

  hospital.registeredDoctor.push({ doctorId,fee, days,availability,status, schedules});
  await hospital.save();

  res
    .status(201)
    .json(
      new apiResponse(
        201,
        hospital.registeredDoctor,
        "Doctor registered successfully."
      )
    );
});

const updateRegisteredDoctor = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId } = req.params; // here `doctorId` is actually the registeredDoctor._id
  const { days, schedules } = req.body;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found."));
  }

  // ✅ Find the registeredDoctor by _id (not doctorId)
  const doc = hospital.registeredDoctor.find(
    (d) => d._id.toString() === doctorId
  );
  if (!doc) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Registered doctor not found."));
  }

  // ✅ Update fields if provided
  if (days) doc.days = days;
  if (schedules) doc.schedules = schedules;

  await hospital.save();

  res
    .status(200)
    .json(new apiResponse(200, doc, "Registered doctor updated successfully."));
});

const deleteRegisteredDoctor = asyncHandler(async (req, res) => {
  const { hospitalId, doctorId } = req.params;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found."));
  }

  const originalLength = hospital.registeredDoctor.length;

  // Correct comparison using .toString()
  hospital.registeredDoctor = hospital.registeredDoctor.filter(
    (doc) => doc._id.toString() !== doctorId
  );

  if (hospital.registeredDoctor.length === originalLength) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Doctor not found in registration."));
  }

  await hospital.save();
  res
    .status(200)
    .json(new apiResponse(200, null, "Doctor removed from hospital."));
});

const getRegisteredDoctors = asyncHandler(async (req, res) => {
  const { hospitalId } = req.params;

  const hospital = await Hospital.findById(hospitalId)
    .populate(
      "registeredDoctor.doctorId",
      "name specialization experience email phone"
    )
    .lean();

  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found."));
  }

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        hospital.registeredDoctor,
        "Registered doctors fetched."
      )
    );
});

const addReviewToHospital = asyncHandler(async (req, res) => {
  const { id: hospitalId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id; // assuming you're using auth middleware

  if (!rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Rating must be between 1 and 5"));
  }

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found"));
  }

  // Check if user already reviewed
  const alreadyReviewed = hospital.reviews.find(
    (r) => r.user.toString() === userId.toString()
  );

  if (alreadyReviewed) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "You have already reviewed this hospital")
      );
  }

  hospital.reviews.push({ user: userId, rating, comment });
  hospital.averageRating = calculateAverageRating(hospital.reviews);
  await hospital.save();

  res
    .status(201)
    .json(new apiResponse(201, hospital.reviews, "Review added successfully"));
});

const updateHospitalReview = asyncHandler(async (req, res) => {
  const { hospitalId, reviewId } = req.params;

  const { rating, comment } = req.body;
  const userId = req.user._id; // authenticated user

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found"));
  }

  const review = hospital.reviews.id(reviewId);

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

  hospital.averageRating = calculateAverageRating(hospital.reviews);
  await hospital.save();

  res
    .status(200)
    .json(
      new apiResponse(200, hospital.reviews, "Review updated successfully")
    );
});

const deleteHospitalReview = asyncHandler(async (req, res) => {
  const { hospitalId, reviewId } = req.params;
  const userId = req.user._id;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found"));
  }

  const review = hospital.reviews.id(reviewId);
  if (!review) {
    return res.status(404).json(new apiResponse(404, null, "Review not found"));
  }

  if (review.user.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new apiResponse(403, null, "Not authorized to delete this review"));
  }

  review.deleteOne(); // remove the review
  hospital.averageRating = calculateAverageRating(hospital.reviews);
  await hospital.save();

  res
    .status(200)
    .json(
      new apiResponse(200, hospital.reviews, "Review deleted successfully")
    );
});

const getHospitalDashboard = asyncHandler(async (req, res) => {
  const { hospitalId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid hospital ID."));
  }

  try {
    const hospital = await Hospital.findById(hospitalId)
      .populate("registeredDoctor")
      .populate("categories")
      .populate("healthCard");

    if (!hospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital not found."));
    }

    const embeddedDoctorCount = hospital.doctors?.length || 0;
    const registeredDoctorCount = hospital.registeredDoctor?.length || 0;
    const totalDoctors = embeddedDoctorCount + registeredDoctorCount;

    // 🔹 Total Appointments
    const totalAppointments = await HospitalAppointment.countDocuments({
      hospital: hospitalId,
      hospitalDelete: false,
    });

    // 🔹 Fetch all appointments for this hospital
    const appointments = await HospitalAppointment.find({
      hospital: hospitalId,
      hospitalDelete: false,
    })
      .populate("patientId", "fullName email phone gender profilepic")
      .sort({ createdAt: -1 });

    // 🔹 Group appointments by status
    const appointmentsByStatus = {
      Pending: [],
      Confirmed: [],
      Completed: [],
      Cancelled: [],
      Rescheduled: [],
    };

     const statusCounts = {
      Pending: 0,
      Confirmed: 0,
      Completed: 0,
      Cancelled: 0,
      Rescheduled: 0,
    };

        appointments.forEach((app) => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      } else {
        statusCounts[app.status] = 1; // in case of unexpected status
      }
    });

    appointments.forEach((app) => {
      if (appointmentsByStatus[app.status]) {
        appointmentsByStatus[app.status].push(app);
      } else {
        appointmentsByStatus[app.status] = [app];
      }
    });

    // 🔹 Unique patient count
    const uniquePatients = await HospitalAppointment.distinct("patientId", {
      hospital: hospitalId,
    });

    // 🔹 Prepare hospital details
    const hospitalDetails = {
      name: hospital.name,
      phone: hospital.phone,
      address: hospital.address,
      profileImage: hospital.profileImage,
      averageRating: hospital.averageRating,
      ownerDetails: hospital.ownerDetails,
      email: hospital.email,
    };

    return res.status(200).json(
      new apiResponse(
        200,
        {
          hospitalDetails,
          totalDoctors,
          embeddedDoctorCount,
          registeredDoctorCount,
          totalAppointments,
          statusCounts,
          totalPatients: uniquePatients.length,
          appointmentsByStatus,
          createdAt: hospital.createdAt,
        },
        "Hospital dashboard fetched successfully"
      )
    );
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});



export {
  addOrUpdateAvailability,
  getDoctorAvailability,
  updateSlotBooking,
  createHospital,
  registerHospital,
  getAllHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
  addDoctorToHospital,
  updateDoctorInHospital,
  updateDoctorInHospital1,
  deleteDoctorFromHospital,
  addReviewToHospital,
  updateHospitalReview,
  deleteHospitalReview,
  getHospitalDashboard,
  getHospitalsNearMe,
  addRegisteredDoctor,
  updateRegisteredDoctor,
  deleteRegisteredDoctor,
  getRegisteredDoctors,
  regenerateAvailabilityOfDoctor,
  regenerateAvailabilityOfDoctor1,
};
