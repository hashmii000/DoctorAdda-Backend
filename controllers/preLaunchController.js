import Doctor from "../models/Doctor.modal.js";
import Category from "../models/Category.modal.js";
import Hospital from "../models/Hospital.modal.js";
import Pharmacy from "../models/Pharmacy.modal.js";
import Diagnostic from "../models/Diagnostic.modal.js";
import Ambulance from "../models/Ambulance.modal.js";
import User from "../models/User.modal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

import moment from "moment";

import { createNotifications } from "./notificationController.js";
import { generateOTP } from "../utils/generateOTP.js";
const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

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

const registerEntity = asyncHandler(async (req, res) => {
  const { schemaType, ...data } = req.body;

  const lat = parseFloat(data.latitude);
  const lng = parseFloat(data.longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid coordinates."));
  }

  const existingUser = await User.findOne({ phone: data.phone });
  if (existingUser) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is already registered"));
  }
  const otp = generateOTP();
  const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

  const user = new User({
    phone: data.phone,
    otp,
    otpExpiration,
  });

  const token = user.generateAuthToken();

  console.log("token", token);

  const userId = user._id;

  if (!user) {
    return res.status(404).json(new apiResponse(404, null, "User not found."));
  }

  let model;
  let entity;

  try {
    switch (schemaType) {
      case "Doctor":
        // Category check

        const existingDoctor = await Doctor.findOne({ phone: data.phone });

        if (existingDoctor) {
          return res
            .status(400)
            .json(
              new apiResponse(
                400,
                null,
                "Doctor with this phone number already exists."
              )
            );
        }

        const categoryName = await Category.findById(data.category);
        if (!categoryName) {
          return res
            .status(400)
            .json(new apiResponse(400, null, "Invalid category ID."));
        }

        // Clinic availability processing
        const processedClinics = (data.clinics || []).map((clinic) => {
          const {
            clinicName,
            clinicAddress,
            location,
            startTime,
            endTime,
            duration = 30,
          } = clinic;
          let availability = [];
          if (startTime && endTime) {
            availability = generateAvailability(startTime, endTime, duration);
          }
          return {
            clinicName,
            clinicAddress,
            location,
            startTime,
            endTime,
            duration,
            availability,
          };
        });

        model = Doctor;
        entity = new Doctor({ ...data, userId, clinics: processedClinics });
        break;

      case "Hospital":
        const existingHospital = await Hospital.findOne({ phone: data.phone });
        if (existingHospital) {
          return res
            .status(400)
            .json(
              new apiResponse(
                400,
                null,
                "Hospital with this phone number already exists."
              )
            );
        }
        model = Hospital;
        entity = new Hospital({
          ...data,
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
          userId,
        });
        break;

      case "Pharmacy":
        const existingPharmacy = await Pharmacy.findOne({ phone: data.phone });
        if (existingPharmacy) {
          return res
            .status(400)
            .json(
              new apiResponse(
                400,
                null,
                "Pharmacy with this phone number already exists."
              )
            );
        }
        model = Pharmacy;
        entity = new Pharmacy({
          ...data,
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
          userId,
        });
        break;

      case "Diagnostic":
        const existingDiagnostic = await Diagnostic.findOne({
          phone: data.phone,
        });
        if (existingDiagnostic) {
          return res
            .status(400)
            .json(
              new apiResponse(
                400,
                null,
                "Diagnostic center with this phone number already exists."
              )
            );
        }

        model = Diagnostic;
        entity = new Diagnostic({
          ...data,
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
          userId,
        });
        break;

      case "Ambulance":
        const existingAmbulance = await Ambulance.findOne({
          phone: data.phone,
        });
        if (existingAmbulance) {
          return res
            .status(400)
            .json(
              new apiResponse(
                400,
                null,
                "Ambulance with this phone number already exists."
              )
            );
        }
        model = Ambulance;
        entity = new Ambulance({
          ...data,
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
          userId,
        });
        break;

      default:
        return res
          .status(400)
          .json(new apiResponse(400, null, "Invalid schemaType provided."));
    }

    const savedEntity = await entity.save();

    // Step 2: Link user → upgraded account
    user.upgradeAccountId = savedEntity._id;
    user.upgradeAccountType = schemaType;
    await user.save();

    // Step 3: Notify user
    await createNotifications({
      title: `${schemaType} Registration Submitted`,
      comment: `Your ${schemaType} registration is under review.`,
      userId: user._id,
      fcmToken: user?.fcmToken,
      screen:"Home"
    });

    const finalData = {
      token,
      savedEntity,
    };

    return res
      .status(201)
      .json(
        new apiResponse(
          201,
          finalData,
          `${schemaType} registered successfully.`
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export { registerEntity };
