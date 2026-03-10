import HospitalAppointment from "../models/HospitalAppointment.modal.js";
import Hospital from "../models/Hospital.modal.js";
import HospitalRazorpayPayment from "../models/HospitalRazorpayPayment.modal.js";

import User from "../models/User.modal.js";
import HospitalWallet from "../models/HospitalWalletHistory.modal.js";
import HospitalNewWallet from "../models/HospitalNewWallet.modal.js";
import PlatformEarning from "../models/PlatformEarning.modal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { handleHospitalSuccessfulPayment } from "../utils/hospitalPaymentSuccessHandler.js";

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

const addHospitalAppointment = asyncHandler(async (req, res) => {
  let {
    hospital,
    doctorType,
    internalDoctorId,
    registeredDoctorId,
    patientId,
    doctorsDetails,
    fee,
    otherPatientDetails,
    date,
    slots,
    screen = "Home",
  } = req.body;

  // Validate required fields
  if (!hospital || !date || !slots || !patientId) {
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
  const existingPatient = await User.findById(patientId);
  if (!existingPatient) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Patient not found"));
  }

  // Validate hospital
  const existingHospital = await Hospital.findById(hospital);
  if (!existingHospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital center not found"));
  }

  // Normalize date for matching
  const inputDate = moment(date).format("YYYY-MM-DD");

  let doctor;
  let availability = [];

  if (doctorType === "Internal") {
    doctor = existingHospital.doctors.find(
      (doc) => doc._id.toString() === internalDoctorId
    );
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Internal doctor not found."));
    }
    availability = doctor.availability || [];
  } else if (doctorType === "Registered") {
    doctor = existingHospital.registeredDoctor.find(
      (doc) => doc._id.toString() === registeredDoctorId
    );
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Registered doctor not found."));
    }
    availability = doctor.availability || [];
  } else {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid doctorType."));
  }

  const doctorAvailability = availability.find(
    (avail) => moment(avail.date).format("YYYY-MM-DD") === inputDate
  );

  if (!doctorAvailability) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          `${
            doctorType === "Internal" ? "Internal doctor" : "Registered doctor"
          } is not available on the selected date.`
        )
      );
  }

  // Check slot
  const slotToBook = doctorAvailability.slots.find(
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

  // Optional: Mark slot as booked (if you want to track it in DB)
  // slotToBook.isBooked = true;
  await existingHospital.save();

  // Generate appointment ID
  const appointmentId = `APT-${Math.floor(Date.now() / 1000)
    .toString()
    .slice(-5)}`;

  // Create and save appointment
  const appointment = new HospitalAppointment({
    hospital,
    doctorType,
    internalDoctorId,
    registeredDoctorId,
    doctorsDetails,
    patientId,
    appointmentId,
    fee,
    otherPatientDetails,
    date,
    slots,
  });

  const savedAppointment = await appointment.save();

  // Populate for response
  const populatedAppointment = await HospitalAppointment.findById(
    savedAppointment._id
  )
    .populate({
      path: "hospital",
      select: "name email phone profileImage address",
    })
    .populate({
      path: "patientId",
      select: "phone name gender email accountType address",
    });

  // Send notification to patient
  await createNotifications({
    title: "Appointment Booked Successfully",
    comment:
      "Your appointment has been successfully booked. We look forward to seeing you soon!",
    details: populatedAppointment.toObject(),
    userId: existingPatient?._id,
    fcmToken: existingPatient?.fcmToken,
    screen: screen,
  });

  // Send notification to hospital
  await createNotifications({
    title: "Appointment Booked Successfully",
    comment: "A new appointment has been booked.",
    details: populatedAppointment.toObject(),
    userId: existingHospital?._id,
    fcmToken: existingHospital?.fcmToken,
    screen: screen,
  });

  // Return response
  return res
    .status(201)
    .json(
      new apiResponse(
        201,
        populatedAppointment,
        "Hospital appointment created successfully"
      )
    );
});

const addHospitalAppointmentWithPayment = asyncHandler(async (req, res) => {
  let {
    hospital,
    doctorType,
    internalDoctorId,
    registeredDoctorId,
    patientId,
    doctorsDetails,
    fee,
    otherPatientDetails,
    date,
    slots,
  } = req.body;

  // Validate required fields
  if (!hospital || !date || !slots || !patientId || !fee) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  if (!slots.startTime || !slots.endTime) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid slot time."));
  }

  try {
    const existingPatient = await User.findById(patientId);
    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }

    const existingHospital = await Hospital.findById(hospital);
    if (!existingHospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital center not found"));
    }

    const inputDate = moment(date).format("YYYY-MM-DD");

    let doctor;
    let availability = [];

    if (doctorType === "Internal") {
      doctor = existingHospital.doctors.find(
        (doc) => doc._id.toString() === internalDoctorId
      );
      if (!doctor) {
        return res
          .status(404)
          .json(new apiResponse(404, null, "Internal doctor not found."));
      }
      availability = doctor.availability || [];
    } else if (doctorType === "Registered") {
      doctor = existingHospital.registeredDoctor.find(
        (doc) => doc._id.toString() === registeredDoctorId
      );
      if (!doctor) {
        return res
          .status(404)
          .json(new apiResponse(404, null, "Registered doctor not found."));
      }
      availability = doctor.availability || [];
    } else {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid doctorType."));
    }

    const doctorAvailability = availability.find(
      (avail) => moment(avail.date).format("YYYY-MM-DD") === inputDate
    );

    if (!doctorAvailability) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            `${
              doctorType === "Internal"
                ? "Internal doctor"
                : "Registered doctor"
            } is not available on the selected date.`
          )
        );
    }

    const slotToBook = doctorAvailability.slots.find(
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

    // Optionally mark the slot as booked (you may defer this till payment success)
    // slotToBook.isBooked = true;
    await existingHospital.save();

    const appointmentId = `APT-${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-5)}`;

    const appointment = new HospitalAppointment({
      hospital,
      doctorType,
      internalDoctorId,
      registeredDoctorId,
      patientId,
      appointmentId,
      fee,
      doctorsDetails,
      otherPatientDetails,
      date,
      slots,
    });

    const savedAppointment = await appointment.save();

    // Razorpay expects amount in paise
    const amountInPaise = parseInt(fee) * 100;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: savedAppointment.appointmentId,
      payment_capture: 1,
    };

    razorpay.orders.create(options, async (err, order) => {
      if (err) {
        console.log("Razorpay error:", err);
        return res
          .status(500)
          .json(
            new apiResponse(500, null, "Error creating Razorpay order", err)
          );
      }

      await HospitalRazorpayPayment.create({
        appointmentId: savedAppointment._id,
        patientId: patientId,
        hospitalId: hospital,
        razorpayOrderId: order.id,
        amount: fee,
        status: "created",
      });

      // Save Razorpay order ID in appointment
      savedAppointment.paymentDetails = {
        orderId: order.id,
        amount: fee,
        currency: "INR",
        status: "created",
      };

      await savedAppointment.save();

      // Return order details and appointment info
      res
        .status(201)
        .json(
          new apiResponse(
            201,
            { orderId: order.id, appointment: savedAppointment },
            "Appointment and Razorpay order created successfully"
          )
        );
    });
  } catch (error) {
    console.log("Payment Error:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const addHospitalAppointmentWithccavPayment = asyncHandler(async (req, res) => {
  let {
    hospital,
    doctorType,
    internalDoctorId,
    registeredDoctorId,
    patientId,
    doctorsDetails,
    fee,
    otherPatientDetails,
    date,
    slots,
  } = req.body;

  // Validate required fields
  if (!hospital || !date || !slots || !patientId || !fee) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  if (!slots.startTime || !slots.endTime) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid slot time."));
  }

  try {
    const existingPatient = await User.findById(patientId);
    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }

    const existingHospital = await Hospital.findById(hospital);
    if (!existingHospital) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital center not found"));
    }

    const inputDate = moment(date).format("YYYY-MM-DD");

    let doctor;
    let availability = [];

    if (doctorType === "Internal") {
      doctor = existingHospital.doctors.find(
        (doc) => doc._id.toString() === internalDoctorId
      );
      if (!doctor) {
        return res
          .status(404)
          .json(new apiResponse(404, null, "Internal doctor not found."));
      }
      availability = doctor.availability || [];
    } else if (doctorType === "Registered") {
      doctor = existingHospital.registeredDoctor.find(
        (doc) => doc._id.toString() === registeredDoctorId
      );
      if (!doctor) {
        return res
          .status(404)
          .json(new apiResponse(404, null, "Registered doctor not found."));
      }
      availability = doctor.availability || [];
    } else {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid doctorType."));
    }

    const doctorAvailability = availability.find(
      (avail) => moment(avail.date).format("YYYY-MM-DD") === inputDate
    );

    if (!doctorAvailability) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            `${
              doctorType === "Internal"
                ? "Internal doctor"
                : "Registered doctor"
            } is not available on the selected date.`
          )
        );
    }

    const slotToBook = doctorAvailability.slots.find(
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

    // Optionally mark the slot as booked (you may defer this till payment success)
    // slotToBook.isBooked = true;
    await existingHospital.save();

    const appointmentId = `APT-${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-5)}`;

    const appointment = new HospitalAppointment({
      hospital,
      doctorType,
      internalDoctorId,
      registeredDoctorId,
      patientId,
      appointmentId,
      fee,
      doctorsDetails,
      otherPatientDetails,
      date,
      slots,
    });

    const savedAppointment = await appointment.save();

    const paymentData = {
      order_id: savedAppointment._id,
      merchant_id: `4402165`,
      currency: "INR",
      amount: savedAppointment.fee || "0",
      redirect_url:
        "https://doctors-adda-back.onrender.com/ccavHospitalResponseHandler",
      cancel_url:
        "https://doctors-adda-back.onrender.com/ccavHospitalResponseHandler",
      // redirect_url: "http://localhost:5000/ccavResponseHandler",
      // cancel_url: "http://localhost:5000/ccavResponseHandler",
      billing_name: req.body.name || "",
      billing_email: req.body.email || "",
      billing_tel: req.body.mobile || "",
    };

    const htmlForm = generateCCAPaymentForm(paymentData);

    res.status(200).send(htmlForm);
  } catch (error) {
    console.log("Payment Error:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Verify Hospital Payment
const verifyHospitalPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    screen = "Home",
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const appointment = await HospitalAppointment.findOne({
    "paymentDetails.orderId": razorpay_order_id,
  });

  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  const {
    date,
    slots,
    hospital,
    doctorType,
    internalDoctorId,
    registeredDoctorId,
  } = appointment;

  const existingHospital = await Hospital.findById(hospital);
  if (!existingHospital) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Hospital not found"));
  }

  const patient = await User.findById(appointment.patientId);
  if (!patient) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Patient not found"));
  }

  const inputDate = new Date(date).toISOString().split("T")[0];

  let doctor;
  let availability = [];

  if (doctorType === "Internal") {
    doctor = existingHospital.doctors.find(
      (doc) => doc._id.toString() === internalDoctorId
    );
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Internal doctor not found"));
    }
    availability = doctor.availability || [];
  } else if (doctorType === "Registered") {
    doctor = existingHospital.registeredDoctor.find(
      (doc) => doc._id.toString() === registeredDoctorId
    );
    if (!doctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Registered doctor not found"));
    }
    availability = doctor.availability || [];
  } else {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid doctorType"));
  }

  const matchedAvailability = availability.find(
    (avail) => new Date(avail.date).toISOString().split("T")[0] === inputDate
  );

  if (!matchedAvailability) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          `${doctorType} is not available on this date.`
        )
      );
  }

  const slotToBook = matchedAvailability.slots.find(
    (slot) =>
      slot.startTime === slots.startTime && slot.endTime === slots.endTime
  );

  if (!slotToBook) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Time slot not found."));
  }

  if (slotToBook?.isBooked) {
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
      // ✅ Update appointment and slot

      //console.log("gdgdfgdfgdfg");
     

      // appointment.status = "Confirmed";
      // appointment.paymentStatus = "Completed";
      // appointment.paymentDetails.transactionId = razorpay_payment_id;
      // appointment.paymentDetails.paymentDate = new Date();
      // slotToBook.isBooked = true;

     // console.log("body============?", body);

      // const actualFee = Number(appointment.fee);
      // existingHospital.wallet += actualFee;

      
        // const walletPercentage = existingHospital.walletPercentage || 10;

        // const platformFee = (appointment.fee * walletPercentage) / 100;

        // const hospitalAmount = appointment.fee - platformFee;

        // const actualFee = Number(hospitalAmount);
        // existingHospital.wallet += actualFee;

        // 4️⃣ Update Razorpay payment table
        await HospitalRazorpayPayment.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: "paid",
            capturedAt: new Date(),
          }
        );

        // 5️⃣ Credit Hospital Wallet (Ledger Entry)
        // await HospitalNewWallet.create({
        //   hospitalId: existingHospital._id,
        //   appointmentId: appointment._id,
        //   amount: hospitalAmount,
        //   type: "credit",
        //   source: "appointment",
        //   note: "Hospital consultation credited after platform deduction",
        // });

        // 6️⃣ Save platform earning
        // await PlatformEarning.create({
        //   appointmentId: appointment._id,
        //   hospitalId: existingHospital._id,
        //   totalAmount: appointment.fee,
        //   platformFee,
        //   hospitalAmount: hospitalAmount, 
        // });

        // 7️⃣ Optional wallet field update (if still maintaining)
       // existingHospital.wallet += hospitalAmount;
       // await existingHospital.save();

      // 💰 Log wallet transaction
      // await HospitalWallet.create({
      //   HospitalId: existingHospital._id,
      //   patientId: patient._id,
      //   consultationId: appointment?._id,
      //   amount: actualFee,
      //   paymentType: "credited",
      //   note: `Hospital service fee credited on ${new Date().toLocaleDateString()}`,
      // });

      await handleHospitalSuccessfulPayment({
        appointment,
        transactionId: razorpay_payment_id,
        paymentGateway: "Razorpay",
      });

     // await existingHospital.save();
      const savedAppointment = await appointment.save();

      const populatedAppointment = await HospitalAppointment.findById(
        savedAppointment._id
      )
        .populate({
          path: "hospital",
          select: "name email phone profileImage address",
        })
        .populate({
          path: "patientId",
          select: "name phone email gender accountType address",
        });

      // 🔔 Notification to patient and hospital
      await createNotifications({
        title: "Hospital Appointment Booked Successfully",
        comment:
          "Your hospital appointment has been successfully booked. Thank you for choosing our service — we look forward to seeing you soon!",
        details: populatedAppointment.toObject(),
        userId: patient._id,
        fcmToken: patient?.fcmToken,
        screen: screen,
      });

      await createNotifications({
        title: "New Hospital Appointment Received",
        comment:
          "A new appointment has been booked by a patient. Please review the appointment details and prepare accordingly.",
        details: populatedAppointment.toObject(),
        userId: existingHospital._id,
        fcmToken: existingHospital?.fcmToken,
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
    console.error("Payment verification error:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get All Hospital Appointments
const getAllHospitalAppointments = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      userId,
      status,
      internalDoctorId,
      registeredDoctorId,
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
        { patientId: new mongoose.Types.ObjectId(userId), userDelete: false },
        {
          hospital: new mongoose.Types.ObjectId(userId),
          hospitalDelete: false,
        },
      ];
    }

    if (internalDoctorId) {
      match.internalDoctorId = internalDoctorId;
    }

    // ✅ Filter by Registered Doctor
    if (registeredDoctorId) {
      match.registeredDoctorId = registeredDoctorId;
    }

    let pipeline = [
      { $match: match },

      {
        $lookup: {
          from: "users",
          localField: "patientId",
          foreignField: "_id",
          as: "patient",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                phone: 1,
                email: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hospitals",
          localField: "hospital",
          foreignField: "_id",
          as: "hospital",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                address: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word, "i"));
      const orConditions = [];

      for (const regex of words) {
        orConditions.push(
          { "patient.name": { $regex: regex } },
          { "hospital.name": { $regex: regex } },
          { "otherPatientDetails.name": { $regex: regex } },
          { appointmentId: { $regex: regex } }
        );
      }

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Sort by creation date
    pipeline.push({ $sort: { createdAt: -1 } });

    // Get total count
    const totalArr = await HospitalAppointment.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalArr[0]?.count || 0;

    // Add pagination if enabled
    if (isPagination === "true") {
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
    }

    const appointments = await HospitalAppointment.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          appointments,
          totalAppointments: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Hospital appointments fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateHospitalAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const appointment = await HospitalAppointment.findById(id);
    if (!appointment) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Hospital appointment not found"));
    }

    const existingPatient = await User.findById(appointment?.patientId);

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

    await createNotifications({
      title: `Appointment ${appointment.status}`,
      comment,
      details: updatedAppointment.toObject(),
      userId: appointment?.patientId,
      fcmToken: existingPatient?.fcmToken,
      screen: "Home",
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedAppointment,
          "Hospital appointment updated successfully"
        )
      );
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete Hospital Appointment
const deleteHospitalAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await HospitalAppointment.findByIdAndDelete(id);
  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  res
    .status(200)
    .json(
      new apiResponse(200, null, "Hospital appointment deleted successfully")
    );
});

const addPrescription = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { uploadBy, url } = req.body;

  const appointment = await HospitalAppointment.findById(appointmentId);
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

  const appointment = await HospitalAppointment.findById(appointmentId);
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

  const appointment = await HospitalAppointment.findById(appointmentId);
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

  const appointment = await HospitalAppointment.findById(appointmentId);
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
  addHospitalAppointment,
  addHospitalAppointmentWithPayment,
  verifyHospitalPayment,
  getAllHospitalAppointments,
  updateHospitalAppointmentStatus,
  deleteHospitalAppointment,
  addPrescription,
  getPrescriptions,
  updatePrescription,
  deletePrescription,
  addHospitalAppointmentWithccavPayment,
};
