import DiagnosticAppointment from "../models/DiagnosticBookingModal.js";

import Diagnostic from "../models/Diagnostic.modal.js";
import User from "../models/User.modal.js";
import DiagnosticWallet from "../models/diagnosticWalletHistory.modal.js";
import DiagnosticRazorpayPayment from "../models/DiagnosticRazorpayPayment.modal.js";
import DiagnosticNewWallet from "../models/DiagnosticWallet.modal.js";
import PlatformEarning from "../models/PlatformEarning.modal.js";

import DoctorReferal from "../models/DoctorReffral.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { handleDiagnosticSuccessfulPayment } from "../utils/diagnosticPaymentSuccessHandler.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import { createNotifications } from "./notificationController.js";
import moment from "moment";
import { generateCCAPaymentForm } from "../payment/ccavenue/ccavRequestHandler.js";
const razorpay = new Razorpay({
  key_id: "rzp_test_wHiuJBhFZCkHSf",
  key_secret: "62fyUUMPXhaQXyH75LXRUbAF",
});

const addDiagnosticAppointment = asyncHandler(async (req, res) => {
  let {
    referBy,
    referalId,
    report,
    amount,
    userAddress,
    date,
    slots,
    patient,
    diagnostic,
    otherPatientDetails,
    packages,
    service,
    screen = "Home",
  } = req.body;

  // Handle empty referBy string
  referBy = referBy === "" ? undefined : referBy;

  // Validate required fields
  if (!patient || !date || !slots || !diagnostic) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  if (!slots.startTime || !slots.endTime) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid slot time."));
  }

  // Validate patient
  const existingPatient = await User.findById(patient);
  if (!existingPatient) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Patient not found"));
  }

  // Validate diagnostic center
  const existingDiagnostic = await Diagnostic.findById(diagnostic);
  if (!existingDiagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic center not found"));
  }

  // Normalize date for matching
  const inputDate = moment(date).format("YYYY-MM-DD");

  const availability = existingDiagnostic.availability.find(
    (avail) => moment(avail.date).format("YYYY-MM-DD") === inputDate
  );

  if (!availability) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Diagnostic center is not available on the selected date."
        )
      );
  }

  // Find slot to book
  const slotToBook = availability.slots.find(
    (slot) =>
      slot.startTime === slots.startTime && slot.endTime === slots.endTime
  );

  if (!slotToBook) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Selected time slot not found."));
  }

  if (slotToBook.isBooked) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Selected slot is already booked."));
  }

  // Mark slot as booked
  // slotToBook.isBooked = true;
  await existingDiagnostic.save();

  // Generate appointment ID
  const appointmentId = `APT-${Math.floor(Date.now() / 1000)
    .toString()
    .slice(-5)}`;

  // Create and save appointment
  const appointment = new DiagnosticAppointment({
    referBy,
    referalId,
    patient,
    diagnostic,
    otherPatientDetails,
    packages,
    userAddress,
    service,
    report,
    amount,
    appointmentId,
    date: date,
    slots,
  });

  const savedAppointment = await appointment.save();

  // Populate for response and notification
  const populatedAppointment = await DiagnosticAppointment.findById(
    savedAppointment._id
  )
    .populate({
      path: "diagnostic",
      select: "name email phone profileImage address",
    })
    .populate({
      path: "patient",
      select: "phone name gender email accountType address",
    })
    .populate({
      path: "referBy",
      select: "fullName phone email profilepic", // You can add more fields if needed
    });

  // Send notification
  await createNotifications({
    title: "Appointment Request Sent",
    comment:
      "Your diagnostic appointment request has been submitted successfully. You will be notified once the diagnostic center reviews and confirms your booking.",
    details: populatedAppointment.toObject(),
    userId: patient,
    fcmToken: existingPatient?.fcmToken,
    screen: screen,
  });


  await createNotifications({
    title: "New Diagnostic Appointment Request",
    comment:
      "A new diagnostic appointment request has been received. Please review the details and confirm the booking at your earliest convenience.",
    details: populatedAppointment.toObject(),
    userId: diagnostic,
    fcmToken: existingDiagnostic?.fcmToken,
    screen: screen,
  });



  // Return success response
  res
    .status(201)
    .json(
      new apiResponse(
        201,
        populatedAppointment,
        "Diagnostic appointment created successfully"
      )
    );
});
const addDiagnosticAppointmentWithPayment = asyncHandler(async (req, res) => {
  let {
    referBy,
    referalId,
    report,
    amount,
    userAddress,
    date,
    slots,
    patient,
    diagnostic,
    otherPatientDetails,
    packages,
    service,
  } = req.body;

  // Handle empty referBy string
  referBy = referBy === "" ? undefined : referBy;

  // Validate required fields
  if (!patient || !date || !slots || !diagnostic) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  try {
    const existingPatient = await User.findById(patient);
    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }
    const existingDiagnostic = await Diagnostic.findById(diagnostic);
    if (!existingDiagnostic) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Diagnostic center not found"));
    }

    const inputDate = moment(date).format("YYYY-MM-DD");

    const availability = existingDiagnostic.availability.find(
      (avail) => moment(avail.date).format("YYYY-MM-DD") === inputDate
    );

    if (!availability) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Diagnostic center is not available on the selected date."
          )
        );
    }

    // Find slot to book
    const slotToBook = availability.slots.find(
      (slot) =>
        slot.startTime === slots.startTime && slot.endTime === slots.endTime
    );

    if (!slotToBook) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Selected time slot not found."));
    }

    if (slotToBook.isBooked) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Selected slot is already booked."));
    }

    // slotToBook.isBooked = true;
    await existingDiagnostic.save();

    // Generate appointment ID
    const appointmentId = `APT-${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-5)}`;

    // Create and save appointment
    const appointment = new DiagnosticAppointment({
      referBy,
      referalId,
      patient,
      diagnostic,
      userAddress,
      otherPatientDetails,
      packages,
      service,
      report,
      amount,
      appointmentId,
      date: date,
      slots,
    });

    const savedAppointment = await appointment.save();

    const options = {
      amount: amount * 100,
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

      await DiagnosticRazorpayPayment.create({
        appointmentId: savedAppointment._id,
        patientId: patient,
        diagnosticId: diagnostic,   // make sure you pass diagnostic ID
        razorpayOrderId: order.id,
        amount: amount,
        status: "created",
      });

      // Save Razorpay order ID in the appointment
      savedAppointment.paymentDetails = {
        orderId: order.id,
        amount: amount,
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

const addDiagnosticAppointmentWithccavPayment = asyncHandler(
  async (req, res) => {
    let {
      referBy,
      referalId,
      report,
      amount,
      userAddress,
      date,
      slots,
      patient,
      diagnostic,
      otherPatientDetails,
      packages,
      service,
    } = req.body;

    // Handle empty referBy string
    referBy = referBy === "" ? undefined : referBy;

    // Validate required fields
    if (!patient || !date || !slots || !diagnostic) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Missing required fields."));
    }

    try {
      const existingPatient = await User.findById(patient);
      if (!existingPatient) {
        return res
          .status(404)
          .json(new apiResponse(404, null, "Patient not found"));
      }
      const existingDiagnostic = await Diagnostic.findById(diagnostic);
      if (!existingDiagnostic) {
        return res
          .status(404)
          .json(new apiResponse(404, null, "Diagnostic center not found"));
      }

      const inputDate = moment(date).format("YYYY-MM-DD");

      const availability = existingDiagnostic.availability.find(
        (avail) => moment(avail.date).format("YYYY-MM-DD") === inputDate
      );

      if (!availability) {
        return res
          .status(400)
          .json(
            new apiResponse(
              400,
              null,
              "Diagnostic center is not available on the selected date."
            )
          );
      }

      // Find slot to book
      const slotToBook = availability.slots.find(
        (slot) =>
          slot.startTime === slots.startTime && slot.endTime === slots.endTime
      );

      if (!slotToBook) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "Selected time slot not found."));
      }

      if (slotToBook.isBooked) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "Selected slot is already booked."));
      }

      // slotToBook.isBooked = true;
      await existingDiagnostic.save();

      // Generate appointment ID
      const appointmentId = `APT-${Math.floor(Date.now() / 1000)
        .toString()
        .slice(-5)}`;

      // Create and save appointment
      const appointment = new DiagnosticAppointment({
        referBy,
        referalId,
        patient,
        diagnostic,
        userAddress,
        otherPatientDetails,
        packages,
        service,
        report,
        amount,
        appointmentId,
        date: date,
        slots,
      });

      const savedAppointment = await appointment.save();

      const paymentData = {
        order_id: savedAppointment._id,
        merchant_id: `4402165`,
        currency: "INR",
        amount: savedAppointment.amount || "0",
        redirect_url:
          "https://doctors-adda-back.onrender.com/ccavDiagnosticsResponseHandler",
        cancel_url:
          "https://doctors-adda-back.onrender.com/ccavDiagnosticsResponseHandler",
        // redirect_url: "http://localhost:5000/ccavDiagnosticsResponseHandler",
        // cancel_url: "http://localhost:5000/ccavDiagnosticsResponseHandler",
        billing_name: req.body.name || "",
        billing_email: req.body.email || "",
        billing_tel: req.body.mobile || "",
      };

      const htmlForm = generateCCAPaymentForm(paymentData);

      res.status(200).send(htmlForm);
    } catch (error) {
      console.log("error payment", error);

      res
        .status(500)
        .json(new apiResponse(500, null, `Error: ${error.message}`));
    }
  }
);

// Verify Diagnostic Payment
const verifyDiagnosticPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    screen = "Home",
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const appointment = await DiagnosticAppointment.findOne({
    "paymentDetails.orderId": razorpay_order_id,
  });

  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  const date = appointment?.date;
  const slots = appointment?.slots;

  const existingDiagnostic = await Diagnostic.findById(appointment?.diagnostic);

  const patient = await User.findById(appointment?.patient);
  if (!existingDiagnostic) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Diagnostic not found"));
  }

  const availability = existingDiagnostic.availability.find(
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
          "Diagnostic is not available on this date at this clinic."
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
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", "62fyUUMPXhaQXyH75LXRUbAF")
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // appointment.status = "Confirmed";
      // appointment.paymentStatus = "Completed";
      // appointment.paymentDetails.transactionId = razorpay_payment_id;
      // appointment.paymentDetails.paymentDate = new Date();
      // slotToBook.isBooked = true;
      // new code
      // const walletPercentage = existingDiagnostic.walletPercentage || 10;

      //   const platformFee = (appointment.amount * walletPercentage) / 100;
      //   const diagnosticAmount = appointment.amount - platformFee;

     //const actualFee = Number(appointment.amount);
      // const actualFee = Number(diagnosticAmount);
      // existingDiagnostic.wallet += actualFee;

      await DiagnosticRazorpayPayment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "paid",
          capturedAt: new Date(),
        }
      );


        // await DiagnosticNewWallet.create({
        //   diagnosticId: existingDiagnostic._id,
        //   appointmentId: appointment._id,
        //   amount: diagnosticAmount,
        //   type: "credit",
        //   source: "appointment",
        //   note: "Diagnostic fee credited",
        // });


        // await PlatformEarning.create({
        //   appointmentId: appointment._id,
        //   diagnosticId: existingDiagnostic._id,
        //   totalAmount: appointment.amount,
        //   platformFee:platformFee,
        //   diagnosticAmount:diagnosticAmount,
        // });
      

      // await DiagnosticWallet.create({
      //   DiagnosticId: existingDiagnostic._id,
      //   patientId: patient._id,
      //   consultationId: appointment._id,
      //   amount: actualFee,
      //   paymentType: "credited",
      //   note: `Diagnostic service fee credited  on ${new Date().toLocaleDateString()}`,
      // });

     // await existingDiagnostic.save();

     await handleDiagnosticSuccessfulPayment({
      appointment,
      transactionId: razorpay_payment_id,
      paymentGateway: "Razorpay",
    });

      const savedAppointment = await appointment.save();

      const populatedAppointment = await DiagnosticAppointment.findById(
        savedAppointment._id
      )
        .populate({
          path: "diagnostic",
          select: "name email phone gender  profilepic address",
        })
        .populate({
          path: "patient",
          select: "phone name gender email accountType address",
        });

      await createNotifications({
        title: "Diagnostic Appointment Booked Successfully",
        comment:
          "Your diagnostic appointment has been booked successfully. Thank you for choosing our service — we look forward to serving you soon!",
        details: populatedAppointment.toObject(),
        userId: patient?._id,
        fcmToken: patient?.fcmToken,
        screen: screen,
      });

      await createNotifications({
        title: "New Diagnostic Appointment Confirmed",
        comment:
          "A new diagnostic appointment has been successfully booked by a patient. Please review the details and prepare accordingly.",
        details: populatedAppointment.toObject(),
        userId: existingDiagnostic._id,
        fcmToken: existingDiagnostic?.fcmToken,
        screen: screen,
      });

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
      res
        .status(400)
        .json(new apiResponse(400, null, "Payment verification failed"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get All Diagnostic Appointments
const getAllDiagnosticAppointments = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      userId,
      status,
      fromDate,
      toDate,
    } = req.query;

    const match = {};

    if (status) {
      match.status = { $regex: status, $options: "i" };
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate); // 2025-09-22T00:00:00
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1); // next day midnight tak include karne ke liye

      match.date = { $gte: from.toISOString(), $lt: to.toISOString() };
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      match.$or = [
        { referBy: new mongoose.Types.ObjectId(userId) },
        { patient: new mongoose.Types.ObjectId(userId), userDelete: false },
        {
          diagnostic: new mongoose.Types.ObjectId(userId),
          diagnosticDelete: false,
        },
      ];
    }

    let pipeline = [
      { $match: match },

      {
        $lookup: {
          from: "doctors",
          localField: "referBy",
          foreignField: "_id",
          as: "referBy",
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
      { $unwind: { path: "$referBy", preserveNullAndEmptyArrays: true } },
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

      {
        $lookup: {
          from: "diagnostics",
          localField: "diagnostic",
          foreignField: "_id",
          as: "diagnostic",
          pipeline: [{ $project: { _id: 1, name: 1, address: 1 } }],
        },
      },
      { $unwind: { path: "$diagnostic", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));
      const orConditions = [];

      for (const regex of words) {
        orConditions.push(
          { "referBy.fullName": { $regex: regex } },
          { "patient.name": { $regex: regex } },
          { "diagnostic.fullName": { $regex: regex } },
          { "otherPatientDetails.name": { $regex: regex } },
          { appointmentId: { $regex: regex } }
        );
      }

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sort by creation date
    pipeline.push({ $sort: { createdAt: -1 } });

    // Get total count
    const totalArr = await DiagnosticAppointment.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalArr[0]?.count || 0;

    // Add pagination if enabled
    if (isPagination === "true") {
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
    }

    const appointments = await DiagnosticAppointment.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          appointments,
          totalAppointments: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Diagnostic appointments fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateDiagnosticAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const appointment = await DiagnosticAppointment.findById(id);
    if (!appointment) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Diagnostic appointment not found"));
    }

    const existingPatient = await User.findById(appointment?.patient);
    const existingDiagnostic = await Diagnostic.findById(appointment?.diagnostic);

    // Validate status if present
    if (
      updateData.status &&
      ![
        "Pending",
        "Confirmed",
        "Completed",
        "Cancelled",
        "Rescheduled",
      ].includes(updateData.status)
    ) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid status provided"));
    }

    if (updateData.status == "Completed") {
      const doctorReferal = await DoctorReferal.findById(
        appointment?.referalId
      );

      if (doctorReferal) {
        doctorReferal.status = "Completed";
        await doctorReferal.save();
      }
    }

    // Validate paymentStatus if present
    if (
      updateData.paymentStatus &&
      !["Pending", "Completed", "Refunded"].includes(updateData.paymentStatus)
    ) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid paymentStatus provided"));
    }

    // Apply updates dynamically
    Object.keys(updateData).forEach((key) => {
      appointment[key] = updateData[key];
    });

    const updatedAppointment = await appointment.save();

    let comment = "";

    switch (appointment.status) {
      case "Pending":
        comment = "Your appointment request is pending confirmation.";
        break;
      case "Confirmed":
        comment =
          "Your appointment is confirmed. We look forward to seeing you soon!";

        break;
      case "Completed":
        comment =
          "Your appointment has been completed. Thank you for visiting us!";
        break;
      case "Cancelled":
        comment =
          "Your appointment has been cancelled. Please contact us if you want to reschedule.";
        break;
      case "Rescheduled":
        comment =
          "Your appointment has been rescheduled. Please check the updated details.";
        break;
      default:
        comment = "Your appointment status has been updated.";
    }

    console.log("appointment", existingPatient?.fcmToken);

    await createNotifications({
      title: `Appointment ${appointment.status}`,
      comment,
      details: updatedAppointment.toObject(),
      userId: appointment?.patient,
      fcmToken: existingPatient?.fcmToken,
      screen: "Home",
    });

    // await createNotifications({
    //   title: `Appointment ${appointment.status}`,
    //   comment,
    //   details: updatedAppointment.toObject(),
    //   userId: appointment?.diagnostic,
    //   fcmToken: existingDiagnostic?.fcmToken,
    //   screen: "Home",
    // });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedAppointment,
          "Diagnostic appointment updated successfully"
        )
      );
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete Diagnostic Appointment
const deleteDiagnosticAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await DiagnosticAppointment.findByIdAndDelete(id);
  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  res
    .status(200)
    .json(
      new apiResponse(200, null, "Diagnostic appointment deleted successfully")
    );
});

export {
  addDiagnosticAppointment,
  addDiagnosticAppointmentWithPayment,
  verifyDiagnosticPayment,
  getAllDiagnosticAppointments,
  updateDiagnosticAppointmentStatus,
  deleteDiagnosticAppointment,
  addDiagnosticAppointmentWithccavPayment,
};
