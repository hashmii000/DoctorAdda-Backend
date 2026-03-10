import DoctorReferal from "../models/DoctorReffral.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import Doctor from "../models/Doctor.modal.js";
import User from "../models/User.modal.js";
import Diagnostic from "../models/Diagnostic.modal.js";
import mongoose from "mongoose";

import crypto from "crypto";

// Create referral
const createDoctorReferral = asyncHandler(async (req, res) => {
  const { doctor, patient, diagnostic, status } = req.body;

  if (!doctor || !patient || !diagnostic) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Doctor, Patient, and Diagnostic Center are required."
        )
      );
  }

  // Validate doctor exists
  const existingDoctor = await Doctor.findById(doctor);
  if (!existingDoctor) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Doctor not found."));
  }

  // Validate patient exists
  const existingPatient = await User.findById(patient);
  if (!existingPatient) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Patient not found."));
  }

  // Validate diagnostic center exists
  const existingDiagnostic = await Diagnostic.findById(diagnostic);
  if (!existingDiagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic center not found."));
  }

  try {
    const referalId = `REF-${crypto
      .randomBytes(2)
      .toString("hex")
      .toUpperCase()}`;

    const referral = new DoctorReferal({
      doctor,
      patient,
      diagnostic,
      status,
      referalId,
    });

    const savedReferral = await referral.save();

    return res
      .status(201)
      .json(
        new apiResponse(201, savedReferral, "Referral created successfully.")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});
// Get all referrals
const getAllDoctorReferrals = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      // userId,
      doctorId,
      patientId,
      diagnosticId,

      status,
    } = req.query;

    const match = {};

    // Match by referral status
    if (status) {
      match.status = { $regex: status, $options: "i" };
    }

    // if (status) {
    //   match.status = { $regex: status, $options: "i" };
    // } else if (patientId) {
    //   match.status = { $ne: "Claimed" };
    // }

    // Filter by doctor, patient, or diagnostic ID
    // if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    //   const userObjectId = new mongoose.Types.ObjectId(userId);
    //   match.$or = [
    //     { doctor: userObjectId },
    //     { patient: userObjectId },
    //     { diagnostic: userObjectId },
    //   ];
    // }



    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      match.patient = new mongoose.Types.ObjectId(patientId);
    }
    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId)) {
      match.doctor = new mongoose.Types.ObjectId(doctorId);
    }

    // ✅ Filter by diagnosticId (exact match)
    if (diagnosticId && mongoose.Types.ObjectId.isValid(diagnosticId)) {
      match.diagnostic = new mongoose.Types.ObjectId(diagnosticId);
    }

    let pipeline = [
      { $match: match },

      // Join doctor info
      {
        $lookup: {
          from: "doctors",
          localField: "doctor",
          foreignField: "_id",
          as: "doctor",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                email: 1,
                address: 1,
                education: 1,
                experience: 1,
                phone: 1,
                serviceType: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },

      // Join patient info
      {
        $lookup: {
          from: "users",
          localField: "patient",
          foreignField: "_id",
          as: "patient",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                bloodType: 1,
                gender: 1,
                injuries: 1,
                phone: 1,
                consumeSmoke: 1,
                consumeAlcohol: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },

      // Join diagnostic info
      {
        $lookup: {
          from: "diagnostics",
          localField: "diagnostic",
          foreignField: "_id",
          as: "diagnostic",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                address: 1,
                phone: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$diagnostic", preserveNullAndEmptyArrays: true } },
    ];

    // Full-text search across fields
    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));

      const orConditions = [];

      for (const regex of words) {
        orConditions.push(
          { "doctor.fullName": { $regex: regex } },
          { "doctor.email": { $regex: regex } },
          { "doctor.phone": { $regex: regex } },
          { "patient.fullName": { $regex: regex } },
          { "patient.email": { $regex: regex } },
          { "patient.phone": { $regex: regex } },
          { "diagnostic.name": { $regex: regex } },
          { "diagnostic.email": { $regex: regex } },
          { "diagnostic.phone": { $regex: regex } },
          { status: { $regex: regex } }
        );
      }

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sort by creation date
    pipeline.push({ $sort: { createdAt: -1 } });

    // Count total results
    const totalReferralsArr = await DoctorReferal.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalReferralsArr[0]?.count || 0;

    // Apply pagination
    if (isPagination === "true") {
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
    }

    const referrals = await DoctorReferal.aggregate(pipeline);

    
    res.status(200).json(
      new apiResponse(
        200,
        {
          referrals,
          totalReferrals: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Doctor referrals fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get referral by ID
const getDoctorReferralById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const referral = await DoctorReferal.findById(id).populate(
      "doctor patient diagnostic"
    );

    if (!referral) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Referral not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, referral, "Referral fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update referral by ID
const updateDoctorReferral = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const referral = await DoctorReferal.findById(id);

    if (!referral) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Referral not found"));
    }

    Object.keys(updateData).forEach((key) => {
      referral[key] = updateData[key];
    });

    const updatedReferral = await referral.save();

    res
      .status(200)
      .json(
        new apiResponse(200, updatedReferral, "Referral updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete referral by ID
const deleteDoctorReferral = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const referral = await DoctorReferal.findByIdAndDelete(id);

    if (!referral) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Referral not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, null, "Referral deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createDoctorReferral,
  getAllDoctorReferrals,
  getDoctorReferralById,
  updateDoctorReferral,
  deleteDoctorReferral,
};
