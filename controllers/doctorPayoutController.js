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

const updateDoctorWallet1 = asyncHandler(async (req, res) => {
  try {
    const { doctorId, amount } = req.body;

    if (!doctorId || typeof amount !== "number") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Doctor ID and amount are required."));
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found."));
    }

    // ✅ Check wallet balance
    if ((doctor.wallet || 0) < amount) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Insufficient wallet balance."));
    }

    // ✅ Deduct amount
    doctor.wallet -= amount;

    await doctor.save();

    return res
      .status(200)
      .json(new apiResponse(200, { doctor }, "Wallet updated successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});
const updateDoctorWallet = asyncHandler(async (req, res) => {
  try {
    const { updates } = req.body; // Expecting: [{ doctorId, amount }, ...]

    if (!Array.isArray(updates) || updates.length === 0) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "An array of doctorId and amount is required."));
    }

    const results = [];

    for (const update of updates) {
      const { doctorId, amount } = update;

      if (!doctorId || typeof amount !== "number") {
        results.push({
          doctorId,
          success: false,
          message: "Invalid doctorId or amount.",
        });
        continue;
      }

      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        results.push({
          doctorId,
          success: false,
          message: "Doctor not found.",
        });
        continue;
      }

      if ((doctor.wallet || 0) < amount) {
        results.push({
          doctorId,
          success: false,
          message: "Insufficient wallet balance.",
        });
        continue;
      }

      doctor.wallet -= amount;
      await doctor.save();

      results.push({
        doctorId,
        success: true,
        updatedWallet: doctor.wallet,
        message: "Wallet updated successfully.",
      });
    }

    return res
      .status(200)
      .json(new apiResponse(200, results, "Wallet update process completed."));
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});


export { updateDoctorWallet };
