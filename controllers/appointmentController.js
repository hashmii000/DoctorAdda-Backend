import Appointment from "../models/appointment.modal.js";
import DoctorWallet from "../models/DoctorWalletHistory.modal.js";
import DoctorsNewWallet from "../models/DoctorWallet.modal.js";
import PlatformEarning from "../models/PlatformEarning.modal.js";
import RazorpayPayment from "../models/RazorpayPayment.modal.js";

import Doctor from "../models/Doctor.modal.js";
import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { handleSuccessfulPayment } from "../utils/paymentSuccessHandler.js";
import Razorpay from "razorpay";
import crypto from "crypto";

import mongoose from "mongoose";
import { createNotifications } from "./notificationController.js";
import { generateCCAPaymentForm } from "../payment/ccavenue/ccavRequestHandler.js";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: "rzp_test_wHiuJBhFZCkHSf",
  key_secret: "62fyUUMPXhaQXyH75LXRUbAF",
});

const addAppointmentWithPayment = asyncHandler(async (req, res) => {
  const {
    doctor,
    patient,
    clinicName,
    isSelf,
    otherPatientDetails,
    date,
    slots,
    fee,
    serviceType,
  } = req.body;

  if (!doctor || !patient || !clinicName || !date || !slots || !serviceType) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  try {
    const existingDoctor = await Doctor.findById(doctor);
    if (!existingDoctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    const existingPatient = await User.findById(patient);
    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }

    // Find the correct clinic
    const clinic = existingDoctor.clinics.find(
      (clinic) => clinic.clinicName === clinicName
    );
    if (!clinic) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Clinic not found for the doctor"));
    }

    const availability =
      serviceType === "Video Consultation"
        ? clinic.videoAvailability.find(
          (avail) =>
            new Date(avail.date).toISOString().split("T")[0] ===
            date.split("T")[0]
        )
        : clinic.availability.find(
          (avail) =>
            new Date(avail.date).toISOString().split("T")[0] ===
            date.split("T")[0]
        );

    if (!availability) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Doctor is not available on this date at this clinic."
          )
        );
    }

    // Find the slot
    const slotToBook = availability.slots.find(
      (slot) =>
        slot.startTime === slots.startTime && slot.endTime === slots.endTime
    );

    if (!slotToBook) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Time slot not found."));
    }

    if (slotToBook.isBooked) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Slot already booked."));
    }

    // slotToBook.isBooked = true;
    await existingDoctor.save();

    const appointmentId = `APT-${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-5)}`; // e.g. APT-0001

    const appointment = new Appointment({
      doctor,
      patient,
      clinicName,
      isSelf,
      otherPatientDetails,
      date,
      fee,
      slots,
      serviceType,
      appointmentId,
      status: "Pending",
      paymentStatus: "Pending",
    });

    const savedAppointment = await appointment.save();

    // Razorpay payment order creation
    const options = {
      amount: fee * 100,
      currency: "INR",
      receipt: savedAppointment.appointmentId,
      payment_capture: 1,
    };

   

    razorpay.orders.create(options, async (err, order) => {
      if (err) {
        console.log("error ", err);

        return res
          .status(500)
          .json(
            new apiResponse(500, null, "Error creating Razorpay order", err)
          );
      }

      await RazorpayPayment.create({
        appointmentId: savedAppointment._id,
        patientId: patient,
        doctorId: doctor,
        razorpayOrderId: order.id,
        amount: fee,
        status: "created",
      });

      // Save Razorpay order ID in the appointment
      savedAppointment.paymentDetails = {
        orderId: order.id,
        amount: fee,
        currency: options.currency,
      };

      await savedAppointment.save();

      // Return order details to frontend
      res
        .status(201)
        .json(
          new apiResponse(
            201,
            { orderId: order.id, appointment: savedAppointment },
            "Appointment created successfully"
          )
        );
    });
  } catch (error) {
    console.log("error payment", error);

    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});


const addAppointmentWithccvanuePayment = asyncHandler(async (req, res) => {
  const {
    doctor,
    patient,
    clinicName,
    isSelf,
    otherPatientDetails,
    date,
    slots,
    fee,
    serviceType,
  } = req.body;

  if (!doctor || !patient || !clinicName || !date || !slots || !serviceType) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  try {
    const existingDoctor = await Doctor.findById(doctor);
    if (!existingDoctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    const existingPatient = await User.findById(patient);
    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }

    // Find the correct clinic
    const clinic = existingDoctor.clinics.find(
      (clinic) => clinic.clinicName === clinicName
    );
    if (!clinic) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Clinic not found for the doctor"));
    }

    const availability =
      serviceType === "Video Consultation"
        ? clinic.videoAvailability.find(
          (avail) =>
            new Date(avail.date).toISOString().split("T")[0] ===
            date.split("T")[0]
        )
        : clinic.availability.find(
          (avail) =>
            new Date(avail.date).toISOString().split("T")[0] ===
            date.split("T")[0]
        );

    if (!availability) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Doctor is not available on this date at this clinic."
          )
        );
    }

    // Find the slot
    const slotToBook = availability.slots.find(
      (slot) =>
        slot.startTime === slots.startTime && slot.endTime === slots.endTime
    );

    if (!slotToBook) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Time slot not found."));
    }

    if (slotToBook.isBooked) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Slot already booked."));
    }

    // slotToBook.isBooked = true;
    await existingDoctor.save();

    const appointmentId = `APT-${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-5)}`;

    const appointment = new Appointment({
      doctor,
      patient,
      clinicName,
      isSelf,
      otherPatientDetails,
      date,
      fee,
      slots,
      serviceType,
      appointmentId,
      status: "Pending",
      paymentStatus: "Pending",
    });

    const savedAppointment = await appointment.save();

    const paymentData = {
      order_id: savedAppointment._id,
      merchant_id: `4402165`,
      currency: "INR",
      amount: savedAppointment.fee || "0",
      redirect_url:
        "https://doctors-adda-back.onrender.com/ccavResponseHandler",
      cancel_url: "https://doctors-adda-back.onrender.com/ccavResponseHandler",
      // redirect_url: "http://localhost:5000/ccavResponseHandler",
      // cancel_url: "http://localhost:5000/ccavResponseHandler",
      billing_name: req.body.name || "",
      billing_email: req.body.email || "",
      billing_tel: req.body.mobile || "",
    };

    // Generate HTML form
    const htmlForm = generateCCAPaymentForm(paymentData);

    res.status(200).send(htmlForm);
  } catch (error) {
    console.log("error payment", error);

    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export const createAppointment = async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    const savedAppointment = await appointment.save();

    // Prepare CCAvenue parameters
    const paymentData = {
      order_id: savedAppointment._id.toString(),
      merchant_id: `4402165`,
      currency: "INR",
      amount: savedAppointment.fee || "0",
      redirect_url: "http://localhost:3000/ccavResponseHandler",
      cancel_url: "http://localhost:3000/ccavResponseHandler",
      billing_name: req.body.name || "",
      billing_email: req.body.email || "",
      billing_tel: req.body.mobile || "",
    };

    // Generate HTML form
    const htmlForm = generateCCAPaymentForm(paymentData);

    res.status(200).send(htmlForm);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create appointment or initiate payment",
      error: error.message,
    });
  }
};


const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // Find the appointment by matching the razorpay_order_id with the orderId in paymentDetails
  const appointment = await Appointment.findOne({
    "paymentDetails.orderId": razorpay_order_id, // Match the orderId in paymentDetails
  });

  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  const date = appointment?.date;
  const slots = appointment?.slots;

  const clinicName = appointment?.clinicName;
  const serviceType = appointment?.serviceType;

  const existingDoctor = await Doctor.findById(appointment?.doctor);
  const patient = await User.findById(appointment?.patient);

  if (!existingDoctor) {
    return res.status(404).json(new apiResponse(404, null, "Doctor not found"));
  }

  const clinic = existingDoctor.clinics.find(
    (clinic) => clinic.clinicName === clinicName
  );
  if (!clinic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Clinic not found for the doctor"));
  }

  const availability =
    serviceType === "Video Consultation"
      ? clinic.videoAvailability.find(
        (avail) =>
          new Date(avail.date).toISOString().split("T")[0] ===
          date.split("T")[0]
      )
      : clinic.availability.find(
        (avail) =>
          new Date(avail.date).toISOString().split("T")[0] ===
          date.split("T")[0]
      );

  if (!availability) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Doctor is not available on this date at this clinic."
        )
      );
  }

  // Find the slot
  const slotToBook = availability.slots.find(
    (slot) =>
      slot.startTime === slots.startTime && slot.endTime === slots.endTime
  );

  if (!slotToBook) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Time slot not found."));
  }

  if (slotToBook.isBooked) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Slot already booked."));
  }

  try {
    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id; // Body to generate the signature
    const expectedSignature = crypto
      .createHmac("sha256", "62fyUUMPXhaQXyH75LXRUbAF") // Replace with your actual Razorpay Secret key
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // const walletPercentage = existingDoctor.walletPercentage || 10;

      // const platformFee = (appointment.fee * walletPercentage) / 100;
      // const doctorAmount = appointment.fee - platformFee;
      // Payment is verified successfully
     // appointment.status = "Confirmed"; // Update appointment status
     // appointment.paymentStatus = "Completed"; // Update payment status
     // appointment.paymentDetails.transactionId = razorpay_payment_id; // Add transaction ID
     // appointment.paymentDetails.paymentDate = new Date(); // Set payment date
      // existingDoctor.wallet += appointment.fee;
      //const actualFee = Number(appointment.fee);
     // const actualFee = Number(doctorAmount);
     // existingDoctor.wallet += actualFee;

      await RazorpayPayment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature:razorpay_signature,
          status: "paid",
          capturedAt: new Date(),
        }
      );

      // appointment.paymentSummary = {
      //   totalAmount: appointment.fee,
      //   platformFee,
      //   doctorAmount,
      //   walletPercentage,
      // };

// await appointment.save();

      // await DoctorsNewWallet.create({
      //   doctorId: existingDoctor._id,
      //   appointmentId: appointment._id,
      //   amount: doctorAmount,
      //   type: "credit",
      //   source: "appointment",
      //   note: "Consultation fee credited",
      // });

      // await PlatformEarning.create({
      //   appointmentId: appointment._id,
      //   doctorId: existingDoctor._id,
      //   totalAmount: appointment.fee,
      //   platformFee,
      //   doctorAmount,
      // });

      // await DoctorWallet.create({
      //   doctorId: existingDoctor._id,
      //   patientId: patient._id,
      //   consultationId: appointment._id,
      //   amount: doctorAmount,
      //   paymentType: "credited",
      //   note: `Consultation fee credited for ${serviceType} on ${new Date().toLocaleDateString()}`,
      // });

      await handleSuccessfulPayment({
        appointment,
        serviceType,
        transactionId: razorpay_payment_id,
        paymentGateway: "Razorpay",
      });

      slotToBook.isBooked = true;
      await existingDoctor.save();

      // await appointment.save();

      const savedAppointment = await appointment.save();

      const populatedAppointment = await Appointment.findById(
        savedAppointment._id
      )
        .populate({
          path: "doctor",
          select: "fullName email phone gender experience hospital profilepic",
        })
        .populate({
          path: "patient",
          select: "phone name gender email accountType",
        });

      await createNotifications({
        title: "Appointment Booked Successfully",
        comment:
          "Your appointment has been booked successfully. Thank you for choosing our service — we look forward to seeing you soon!",
        details: populatedAppointment.toObject(),
        userId: appointment?.patient,
        fcmToken: patient?.fcmToken,
      });
      await createNotifications({
        title: "New Appointment Confirmed",
        comment:
          "A new appointment has been successfully booked with you. Please review the appointment details and prepare for the session.",
        details: populatedAppointment.toObject(),
        userId: existingDoctor._id,
        fcmToken: existingDoctor?.fcmToken,
      });

      // Save the updated appointment to the database

      res
        .status(200)
        .json(
          new apiResponse(
            200,
            populatedAppointment,
            "Payment verified successfully"
          )
        );
    } else {
      // Payment verification failed due to signature mismatch
      res
        .status(400)
        .json(new apiResponse(400, null, "Payment verification failed"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const addAppointment = asyncHandler(async (req, res) => {
  const {
    doctor,
    patient,
    clinicName,
    isSelf,
    otherPatientDetails,
    date,
    fee,
    slots,
    serviceType,
  } = req.body;

  if (!doctor || !patient || !clinicName || !date || !slots || !serviceType) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  try {
    const existingDoctor = await Doctor.findById(doctor);
    if (!existingDoctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
    }

    const existingPatient = await User.findById(patient);

    if (!existingPatient) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    // Find the correct clinic
    const clinic = existingDoctor.clinics.find(
      (clinic) => clinic.clinicName === clinicName
    );
    if (!clinic) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Clinic not found for the doctor"));
    }

    // Find availability by date (YYYY-MM-DD)
    const availability = clinic.availability.find(
      (avail) =>
        new Date(avail.date).toISOString().split("T")[0] === date.split("T")[0]
    );
    if (!availability) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Doctor is not available on this date at this clinic."
          )
        );
    }

    // Find the slot
    const slotToBook = availability.slots.find(
      (slot) =>
        slot.startTime === slots.startTime && slot.endTime === slots.endTime
    );

    if (!slotToBook) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Time slot not found."));
    }

    if (slotToBook.isBooked) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Slot already booked."));
    }

    // Mark slot as booked
    // slotToBook.isBooked = true;

    // Save updated doctor document
    // await existingDoctor.save();

    // Generate appointment ID
    const appointmentId = `APT-${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-5)}`;

    // Save appointment
    const appointment = new Appointment({
      doctor,
      patient,
      clinicName,
      isSelf,
      otherPatientDetails,
      date,
      fee,
      slots,
      serviceType,
      appointmentId,
    });
    const savedAppointment = await appointment.save();

    const populatedAppointment = await Appointment.findById(
      savedAppointment._id
    )
      .populate({
        path: "doctor",
        select: "fullName email phone gender experience hospital profilepic",
      })
      .populate({
        path: "patient",
        select: "phone name gender email accountType",
      });

    await createNotifications({
      title: "New Appointment Request",
      comment:
        "You have received a new appointment request from a patient. Please review the details and confirm the booking at your earliest convenience.",
      details: populatedAppointment.toObject(),
      userId: doctor,
      fcmToken: existingDoctor?.fcmToken,
      screen: "Home",
    });
    await createNotifications({
      title: "Appointment Request Sent",
      comment:
        "Your appointment request has been sent to the doctor. You will be notified once the doctor reviews and confirms your appointment.",
      details: populatedAppointment.toObject(),
      userId: patient,
      fcmToken: existingPatient?.fcmToken,
      screen: "Home",
    });

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          populatedAppointment,
          "Appointment created successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findById(id)
      .populate({
        path: "doctor",
        select: "fullName email phone gender experience hospital profilepic",
      })
      .populate({
        path: "patient",
        select: "phone name gender email accountType",
      })
      .populate({
        path: "diagnostic",
        select: "phone name gender email accountType",
      });

    if (!appointment) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Appointment not found"));
    }

    res
      .status(200)
      .json(
        new apiResponse(200, appointment, "Appointment fetched successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllAppointments = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      userId,
      status,
      serviceType,
      category,
      petName,
      fromDate,
      toDate,
    } = req.query;

    const match = {};

    // Match appointment status
    if (status) {
      match.status = { $regex: status, $options: "i" };
    }

    // Date filter
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1);
      match.date = { $gte: from.toISOString(), $lt: to.toISOString() };
    }

    // Service type filter
    if (
      serviceType &&
      ["In-clinic", "Video Consultation"].includes(serviceType)
    ) {
      match.serviceType = serviceType;
    }

    // Filter by userId (doctor or patient)
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const objectIdUser = new mongoose.Types.ObjectId(userId);

      match.$or = [
        { doctor: objectIdUser, doctorDelete: false },
        { patient: objectIdUser, userDelete: false },
      ];
    }

    const pipeline = [
      { $match: match },

      // ✅ Populate Diagnostic
      {
        $lookup: {
          from: "diagnostics", // your Diagnostic collection name
          localField: "diagnostic",
          foreignField: "_id",
          as: "diagnostic",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                phone: 1,
                email: 1,
                address: 1,
                city: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$diagnostic",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Join doctor details
      {
        $lookup: {
          from: "doctors",
          localField: "doctor",
          foreignField: "_id",
          as: "doctor",
          pipeline: [
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
            },
            {
              $project: {
                _id: 1,
                fullName: 1,
                email: 1,
                phone: 1,
                experience: 1,
                about: 1,
                education: 1,
                category: {
                  _id: 1,
                  name: 1,
                },
              },
            },
          ],
        },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },

      // Join patient (user) details
      {
        $lookup: {
          from: "users",
          localField: "patient",
          foreignField: "_id",
          as: "patient",
          pipeline: [{ $project: { _id: 1, name: 1, phone: 1, email: 1 } }],
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
    ];

    // Filter by category name
    if (category) {
      pipeline.push({
        $match: { "doctor.category.name": { $regex: category, $options: "i" } },
      });
    }

    // Filter by pet name
    if (petName) {
      pipeline.push({
        $match: {
          "otherPatientDetails.name": { $regex: petName, $options: "i" },
        },
      });
    }

    // Text search
    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));

      const orConditions = [];

      for (const regex of words) {
        orConditions.push(
          { "doctor.fullName": regex },
          { "doctor.phone": regex },
          { "doctor.email": regex },
          { "patient.name": regex },
          { "patient.phone": regex },
          { "patient.email": regex },
          { "otherPatientDetails.name": regex },
          { "diagnostic.name": regex },
          { appointmentId: regex },
          { date: regex },
          { serviceType: regex }
        );
      }

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sort
    pipeline.push({ $sort: { createdAt: -1 } });

    // Count before pagination
    const totalAppointmentsArr = await Appointment.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalAppointmentsArr[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (page - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    // Execute
    const appointments = await Appointment.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          appointments,
          totalAppointments: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Appointments fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error in getAllAppointments:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// const updateAppointmentStatus = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const { status, paymentStatus, date, slots } = req.body;

//   if (
//     !paymentStatus ||
//     !["Pending", "Completed", "Refunded"].includes(paymentStatus)
//   ) {
//     return res
//       .status(400)
//       .json(new apiResponse(400, null, "Invalid paymentStatus provided"));
//   }
//   if (
//     !status ||
//     !["Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled"].includes(
//       status
//     )
//   ) {
//     return res
//       .status(400)
//       .json(new apiResponse(400, null, "Invalid status provided"));
//   }

//   try {
//     const appointment = await Appointment.findById(id);
//     if (!appointment) {
//       return res
//         .status(404)
//         .json(new apiResponse(404, null, "Appointment not found"));
//     }

//     const existingDoctor = await Doctor.findById(appointment?.doctor);

//     const existingPatient = await User.findById(appointment?.patient);

//     // Find the correct clinic
//     const clinic = existingDoctor?.clinics?.find(
//       (clinic) => clinic.clinicName === appointment?.clinicName
//     );
//     if (!clinic) {
//       return res
//         .status(404)
//         .json(new apiResponse(404, null, "Clinic not found for the doctor"));
//     }

//     // Find availability by date (YYYY-MM-DD)
//     const availability = clinic?.availability?.find(
//       (avail) =>
//         new Date(avail?.date)?.toISOString().split("T")[0] ===
//         appointment?.date.split("T")[0]
//     );

//     if (status != "Completed") {
//       if (!availability) {
//         return res
//           .status(400)
//           .json(
//             new apiResponse(
//               400,
//               null,
//               "Doctor is not available on this date at this clinic."
//             )
//           );
//       }
//     }

//     // Find the slot
//     const slotToBook = availability?.slots?.find(
//       (slot) =>
//         slot?.startTime === appointment?.slots?.startTime &&
//         slot?.endTime === appointment?.slots?.endTime
//     );

//     if (status != "Completed") {
//       if (!slotToBook) {
//         return res
//           .status(400)
//           .json(new apiResponse(400, null, "Time slot not found."));
//       }
//     }

//     if (status == "Confirmed") {
//       if (slotToBook?.isBooked) {
//         return res
//           .status(400)
//           .json(new apiResponse(400, null, "Slot already booked."));
//       }

//       slotToBook.isBooked = true;
//       appointment.status = status;
//       appointment.paymentStatus = paymentStatus;
//       await existingDoctor.save();
//     } else if (status == "Rescheduled") {
//       appointment.slots = slots;
//       appointment.date = date;
//       appointment.status = status;
//       appointment.paymentStatus = paymentStatus;
//     } else {
//       // slotToBook?.isBooked = true;
//       appointment.status = status;
//       appointment.paymentStatus = paymentStatus;
//     }

//     // Mark slot as booked

//     let comment = "";

//     switch (appointment.status) {
//       case "Pending":
//         comment =
//           "Your appointment request is pending confirmation from the doctor.";
//         break;

//       case "Confirmed":
//         comment =
//           "Good news! Your appointment has been confirmed by the doctor. Please arrive on time.";
//         break;

//       case "Completed":
//         comment =
//           "Your appointment has been successfully completed. Thank you for trusting our service!";
//         break;

//       case "Cancelled":
//         comment =
//           "Unfortunately, your appointment has been cancelled by the doctor. You can request a new appointment if needed.";
//         break;

//       case "Rescheduled":
//         comment =
//           "Your appointment has been rescheduled by the doctor. Please review the updated date and time.";
//         break;

//       default:
//         comment = "Your appointment status has been updated.";
//     }
//     const updatedAppointment = await appointment.save();

//     await createNotifications({
//       title: `Appointment ${appointment.status}`,
//       comment,
//       details: updatedAppointment.toObject(),
//       userId: appointment?.patient,
//       fcmToken: existingPatient?.fcmToken,
//       screen: "Home",
//     });

//     res
//       .status(200)
//       .json(
//         new apiResponse(
//           200,
//           updatedAppointment,
//           "Appointment status updated successfully"
//         )
//       );
//   } catch (error) {
//     res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
//   }
// });





const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus, date, slots, uniqueId, diagnostic } = req.body; // 👈 added uniqueId

  if (
    !paymentStatus ||
    !["Pending", "Completed", "Refunded"].includes(paymentStatus)
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid paymentStatus provided"));
  }

  if (
    !status ||
    !["Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled"].includes(
      status
    )
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid status provided"));
  }

  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Appointment not found"));
    }

    const existingDoctor = await Doctor.findById(appointment?.doctor);
    const existingPatient = await User.findById(appointment?.patient);

    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }

    // 🔹 If status is "Completed", validate uniqueId
    if (status === "Completed") {
      if (!uniqueId) {
        return res
          .status(400)
          .json(
            new apiResponse(
              400,
              null,
              "uniqueId is required to complete appointment"
            )
          );
      }

      if (existingPatient.uniqueId !== uniqueId) {
        return res
          .status(403)
          .json(
            new apiResponse(
              403,
              null,
              "Invalid uniqueId — does not match patient's registered ID"
            )
          );
      }
    }

    // Find the correct clinic
    const clinic = existingDoctor?.clinics?.find(
      (clinic) => clinic.clinicName === appointment?.clinicName
    );
    if (!clinic) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Clinic not found for the doctor"));
    }

    // Find availability by date
    const availability = clinic?.availability?.find(
      (avail) =>
        new Date(avail?.date)?.toISOString().split("T")[0] ===
        appointment?.date.split("T")[0]
    );

    if (status !== "Completed") {
      if (!availability) {
        return res
          .status(400)
          .json(
            new apiResponse(
              400,
              null,
              "Doctor is not available on this date at this clinic."
            )
          );
      }
    }

    // Find the slot
    const slotToBook = availability?.slots?.find(
      (slot) =>
        slot?.startTime === appointment?.slots?.startTime &&
        slot?.endTime === appointment?.slots?.endTime
    );

    if (status !== "Completed") {
      if (!slotToBook) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "Time slot not found."));
      }
    }
    if (diagnostic) {
      appointment.diagnostic = diagnostic;
    }

    // 🔹 Update logic
    if (status == "Confirmed") {
      if (slotToBook?.isBooked) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "Slot already booked."));
      }

      slotToBook.isBooked = true;
      appointment.status = status;
      appointment.paymentStatus = paymentStatus;
      await existingDoctor.save();
    } else if (status == "Rescheduled") {
      appointment.slots = slots;
      appointment.date = date;
      appointment.status = status;
      appointment.paymentStatus = paymentStatus;
    } else {
      appointment.status = status;
      appointment.paymentStatus = paymentStatus;
    }

    // 🔹 Generate notification comment
    let comment = "";
    switch (appointment.status) {
      case "Pending":
        comment =
          "Your appointment request is pending confirmation from the doctor.";
        break;
      case "Confirmed":
        comment =
          "Good news! Your appointment has been confirmed by the doctor. Please arrive on time.";
        break;
      case "Completed":
        comment =
          "Your appointment has been successfully completed. Thank you for trusting our service!";
        break;
      case "Cancelled":
        comment =
          "Unfortunately, your appointment has been cancelled by the doctor.";
        break;
      case "Rescheduled":
        comment = "Your appointment has been rescheduled by the doctor.";
        break;
      default:
        comment = "Your appointment status has been updated.";
    }

    const updatedAppointment = await appointment.save();

    await createNotifications({
      title: `Appointment ${appointment.status}`,
      comment,
      details: updatedAppointment.toObject(),
      userId: appointment?.patient,
      fcmToken: existingPatient?.fcmToken,
      screen: "Home",
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedAppointment,
          "Appointment status updated successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const { uniqueId } = req.body; // 👈 Added uniqueId for verification

  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Appointment not found"));
    }

    // Get associated patient & doctor
    const existingPatient = await User.findById(appointment?.patient);
    const existingDoctor = await Doctor.findById(appointment?.doctor);

    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }

    // 🧠 If status is being set to "Completed", validate uniqueId
    if (updateData.status === "Completed") {
      if (!uniqueId) {
        return res
          .status(400)
          .json(
            new apiResponse(
              400,
              null,
              "uniqueId is required to complete the appointment"
            )
          );
      }

      if (existingPatient.uniqueId !== uniqueId) {
        return res
          .status(403)
          .json(
            new apiResponse(
              403,
              null,
              "Invalid uniqueId — does not match patient's registered ID"
            )
          );
      }
    }

    // 🚫 Optional: Prevent modifying restricted fields
    const restrictedFields = ["_id", "createdAt", "updatedAt"];
    restrictedFields.forEach((field) => delete updateData[field]);

    // ✅ Update only valid fields
    Object.keys(updateData).forEach((key) => {
      appointment[key] = updateData[key];
    });

    const updatedAppointment = await appointment.save();

    // 🧩 When status = Completed, also handle vaccine reminder logic
    if (updateData.status === "Completed" && updateData?.vaccineInfo) {
      const vaccineName =
        updatedAppointment.vaccineInfo.vaccine || "your vaccine";
      const nextDate = updatedAppointment.vaccineInfo.nextVaccineDate
        ? new Date(
          updatedAppointment.vaccineInfo.nextVaccineDate
        ).toLocaleDateString()
        : "the scheduled date";

      await createNotifications({
        title: "Appointment Completed & Next Vaccine Reminder",
        comment: `Your appointment has been completed successfully. Please remember your next dose of ${vaccineName} is scheduled on ${nextDate}.`,
        details: updatedAppointment.toObject(),
        userId: existingPatient?._id,
        fcmToken: existingPatient?.fcmToken,
        screen: "Home",
      });
    } else {
      // 🔔 Send general notification based on updated status
      let comment = "";
      switch (updateData.status) {
        case "Pending":
          comment =
            "Your appointment request is pending confirmation from the doctor.";
          break;
        case "Confirmed":
          comment =
            "Good news! Your appointment has been confirmed by the doctor. Please arrive on time.";
          break;
        case "Completed":
          comment =
            "Your appointment has been successfully completed. Thank you for trusting our service!";
          break;
        case "Cancelled":
          comment =
            "Unfortunately, your appointment has been cancelled by the doctor.";
          break;
        case "Rescheduled":
          comment = "Your appointment has been rescheduled by the doctor.";
          break;
        default:
          comment = "Your appointment status has been updated.";
      }

      await createNotifications({
        title: `Appointment ${updateData.status}`,
        comment,
        details: updatedAppointment.toObject(),
        userId: appointment?.patient,
        fcmToken: existingPatient?.fcmToken,
        screen: "Home",
      });
    }

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedAppointment,
          "Appointment updated successfully"
        )
      );
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findByIdAndDelete(id);
    if (!appointment) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Appointment not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, null, "Appointment deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateDoctorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { doctorStatus } = req.body;

  try {
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Appointment not found"));
    }

    const patient = await User.findById(appointment?.patient);

    // Update doctor status
    appointment.doctorStatus = doctorStatus;
    await appointment.save();

    // Notification content based on status
    let title = "";
    let comment = "";

    switch (doctorStatus) {
      case "Preparing":
        title = "Doctor is preparing for your appointment";
        comment =
          "Please be patient while the doctor gets ready for your session.";
        break;
      case "Ready":
        title = "Doctor is ready for your appointment";
        comment =
          "The doctor is ready now. Please join or visit the clinic as scheduled.";
        break;
      case "In Session":
        title = "Your appointment is now in session";
        comment = "The doctor is currently attending your appointment.";
        break;
      default:
        title = "Appointment Status Updated";
        comment = "Please check your appointment details.";
    }

    // Send notification
    await createNotifications({
      title,
      comment,
      details: appointment.toObject(),
      userId: patient?._id,
      fcmToken: patient?.fcmToken,
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          null,
          "Appointment doctor status updated successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getVaccineReminder = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Valid patient ID is required"));
  }

  const today = new Date();
  const threeDaysAhead = new Date();
  threeDaysAhead.setDate(today.getDate() + 3);

  const twoDaysBack = new Date();
  twoDaysBack.setDate(today.getDate() - 2);

  // Filter for this patient, valid date range, and status not true
  const appointment = await Appointment.findOne({
    patient: patientId,
    "vaccineInfo.nextVaccineDate": {
      $gte: twoDaysBack,
      $lte: threeDaysAhead,
    },
    "vaccineInfo.status": { $ne: "true" },
  });

  if (!appointment) {
    return res
      .status(200)
      .json(new apiResponse(200, null, "No vaccine reminder to show"));
  }

  const { nextVaccineDate, vaccine } = appointment.vaccineInfo;

  const daysDiff =
    Math.floor((new Date(nextVaccineDate) - today) / (1000 * 60 * 60 * 24)) + 1;

  let message = null;

  if (daysDiff > 0 && daysDiff < 3) {
    message = `Your "${vaccine}" vaccination is coming up in ${daysDiff} day(s). Please be prepared.`;
  } else if (daysDiff === 0) {
    message = `Your "${vaccine}" vaccination is scheduled for today. Please don’t forget.`;
  } else if (daysDiff < 0 && daysDiff > -2) {
    message = `You missed your "${vaccine}" vaccination ${Math.abs(
      daysDiff
    )} day(s) ago. Please contact your healthcare provider.`;
  }

  if (!message) {
    return res
      .status(200)
      .json(new apiResponse(200, null, "No vaccine reminder to show"));
  }

  return res.status(200).json(
    new apiResponse(
      200,
      {
        message,
        nextVaccineDate,
        appointementDetails: appointment,
      },
      "Vaccine reminder fetched successfully"
    )
  );
});

const addPrescription = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { uploadBy, url } = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  appointment.prescriptions.push({ uploadBy, url });
  await appointment.save();

  res
    .status(201)
    .json(
      new apiResponse(201, appointment.prescriptions, "Prescription added")
    );
});

const getPrescriptions = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  res
    .status(200)
    .json(
      new apiResponse(200, appointment.prescriptions, "Prescriptions retrieved")
    );
});

const updatePrescription = asyncHandler(async (req, res) => {
  const { appointmentId, prescriptionId } = req.params;
  const { uploadBy, url } = req.body;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  const prescription = appointment.prescriptions.id(prescriptionId);
  if (!prescription) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Prescription not found"));
  }

  // Update fields
  if (uploadBy) prescription.uploadBy = uploadBy;
  if (url) prescription.url = url;

  await appointment.save();

  res
    .status(200)
    .json(
      new apiResponse(200, prescription, "Prescription updated successfully")
    );
});

const deletePrescription = asyncHandler(async (req, res) => {
  const { appointmentId, prescriptionId } = req.params;

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  const prescription = appointment.prescriptions.id(prescriptionId);
  if (!prescription) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Prescription not found"));
  }

  // Remove the prescription subdocument
  appointment.prescriptions = appointment.prescriptions.filter(
    (p) => p._id.toString() !== prescriptionId
  );
  await appointment.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        appointment.prescriptions,
        "Prescription deleted successfully"
      )
    );
});

export {
  addAppointment,
  getVaccineReminder,
  getAppointmentById,
  updateDoctorStatus,
  getAllAppointments,
  updateAppointmentStatus,
  updateAppointment,
  deleteAppointment,
  addAppointmentWithPayment,
  addAppointmentWithccvanuePayment,
  verifyPayment,
  addPrescription,
  getPrescriptions,
  updatePrescription,
  deletePrescription,
};
