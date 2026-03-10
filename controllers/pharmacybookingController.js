import PharmacyAppointment from "../models/pharmacybooking.modal.js";
import Pharmacy from "../models/Pharmacy.modal.js";
import PharmacyWallet from "../models/pharmacyWalletHistory.modal.js";

import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { createNotifications } from "./notificationController.js";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import { generateCCAPaymentForm } from "../payment/ccavenue/ccavRequestHandler.js";

const razorpay = new Razorpay({
  key_id: "rzp_test_wHiuJBhFZCkHSf",
  key_secret: "62fyUUMPXhaQXyH75LXRUbAF",
});

const addPharmacyOrderWithPayment = asyncHandler(async (req, res) => {
  let { patient, pharmacy, amount, orderId } = req.body;

  // Validate required fields
  if (!patient || !orderId || !pharmacy || !amount) {
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
    const existingPharmacy = await Pharmacy.findById(pharmacy);
    if (!existingPharmacy) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Pharmacy  not found"));
    }
    const existingOrder = await PharmacyAppointment.findById(orderId);
    if (!existingOrder) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Order  not found"));
    }

    // await existingDiagnostic.save();

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: existingOrder?.appointmentId,
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

      // Save Razorpay order ID in the appointment
      existingOrder.paymentDetails = {
        orderId: order.id,
        amount: amount,
        currency: options.currency,
      };

      await existingOrder.save();

      // Return order details to frontend
      res
        .status(201)
        .json(
          new apiResponse(
            201,
            { data: existingOrder },
            "Order created successfully"
          )
        );
    });
  } catch (error) {
    console.log("error payment", error);

    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});
const addPharmacyOrderWithccavPayment = asyncHandler(async (req, res) => {
  let { patient, pharmacy, amount, orderId } = req.body;

  // Validate required fields
  if (!patient || !orderId || !pharmacy || !amount) {
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
    const existingPharmacy = await Pharmacy.findById(pharmacy);
    if (!existingPharmacy) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Pharmacy  not found"));
    }
    const existingOrder = await PharmacyAppointment.findById(orderId);
    if (!existingOrder) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Order  not found"));
    }

    const paymentData = {
      order_id: existingOrder._id,
      merchant_id: `4402165`,
      currency: "INR",
      amount: existingOrder.amount || "0",
      redirect_url:
        "https://doctors-adda-back.onrender.com/ccavPharmacyResponseHandler",
      cancel_url:
        "https://doctors-adda-back.onrender.com/ccavPharmacyResponseHandler",
      // redirect_url: "http://localhost:5000/ccavPharmacyResponseHandler",
      // cancel_url: "http://localhost:5000/ccavPharmacyResponseHandler",
      billing_name: req.body.name || "",
      billing_email: req.body.email || "",
      billing_tel: req.body.mobile || "",
    };

    await existingOrder.save();
    const htmlForm = generateCCAPaymentForm(paymentData);

    res.status(200).send(htmlForm);

    // await existingDiagnostic.save();







  } catch (error) {
    console.log("error payment", error);

    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Verify Diagnostic Payment
const verifyDiagnosticPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    screen = "Home",
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const order = await PharmacyAppointment.findOne({
    "paymentDetails.orderId": razorpay_order_id,
  });

  if (!order) {
    return res.status(404).json(new apiResponse(404, null, "order not found"));
  }

  const existingPharmacy = await Pharmacy.findById(order?.pharmacy);

  const patient = await User.findById(order?.patient);
  if (!existingPharmacy) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", "62fyUUMPXhaQXyH75LXRUbAF")
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      order.status = "Confirmed";
      order.paymentStatus = "Completed";
      order.paymentDetails.transactionId = razorpay_payment_id;
      order.paymentDetails.paymentDate = new Date();

      const actualFee = Number(order.amount);
      existingPharmacy.wallet += actualFee;

      await PharmacyWallet.create({
        PharmacyId: existingPharmacy._id,
        patientId: patient._id,
        consultationId: order._id,
        amount: actualFee,
        paymentType: "credited",
        note: `Pharmacy service fee credited  on ${new Date().toLocaleDateString()}`,
      });

      await existingPharmacy.save();

      const savedAppointment = await order.save();

      const populatedAppointment = await PharmacyAppointment.findById(
        savedAppointment._id
      )
        .populate({
          path: "pharmacy",
          select:
            "name onlinePayment cod email phone gender  profilepic address",
        })
        .populate({
          path: "patient",
          select: "phone name gender email accountType address",
        });

      await createNotifications({
        title: "Payment Successfuly",
        comment:
          "Your appointment has been successfully booked. We look forward to seeing you soon!",
        details: populatedAppointment.toObject(),
        userId: patient,
        fcmToken: existingPharmacy?.fcmToken,
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

// Add Pharmacy Appointment
const addPharmacyAppointmentWithPriscription = asyncHandler(
  async (req, res) => {
    const {
      patient,
      pharmacy,
      cod,
      onlinePayment,
      deliveryMode,
      otherPatientDetails,
      userAddress,
      report,
      screen = "Home",
    } = req.body;

    if (!patient || !pharmacy) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Missing required fields."));
    }

    const existingPatient = await User.findById(patient);
    if (!existingPatient) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Patient not found"));
    }

    const existingPharmacy = await Pharmacy.findById(pharmacy);

    if (!existingPharmacy) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Pharmacy not found"));
    }

    const appointmentId = `ORD-${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-5)}`;

    const appointment = new PharmacyAppointment({
      patient,
      pharmacy,
      deliveryMode,
      cod,
      onlinePayment,
      otherPatientDetails,
      userAddress,
      report,
      appointmentId,
    });

    const savedAppointment = await appointment.save();

    const populatedAppointment = await PharmacyAppointment.findById(
      savedAppointment._id
    )
      .populate(
        "pharmacy",
        "name email  onlinePayment cod phone profileImage address"
      )
      .populate("patient", "phone name gender email accountType address");

    await createNotifications({
      title: "Medicine Order Placed Successfully",
      comment:
        "Your prescription has been submitted and the pharmacy will review and process your medicine order shortly.",
      details: populatedAppointment.toObject(),
      userId: existingPatient._id,
      fcmToken: existingPatient?.fcmToken,
      screen: screen,
    });

    await createNotifications({
      title: "New Prescription Order Received",
      comment: `You have received a new medicine order from ${existingPatient.name}. Please review the prescription and process the order.`,
      details: populatedAppointment.toObject(),
      userId: existingPharmacy._id,
      fcmToken: existingPharmacy?.fcmToken,
      screen: screen,
    });

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          populatedAppointment,
          "Pharmacy appointment created successfully"
        )
      );
  }
);

const addPharmacyAppointment = asyncHandler(async (req, res) => {
  const {
    patient,
    pharmacy,
    otherPatientDetails,
    medicine,
    cod,
    onlinePayment,
    amount,
    deliveryMode,
    report,
    discription,
    userAddress,
    screen = "Home",
  } = req.body;

  if (!patient || !pharmacy) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  const existingPatient = await User.findById(patient);
  if (!existingPatient) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Patient not found"));
  }

  const existingPharmacy = await Pharmacy.findById(pharmacy);
  if (!existingPharmacy) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
  }

  const appointmentId = `ORD-${Math.floor(Date.now() / 1000)
    .toString()
    .slice(-5)}`;

  const appointment = new PharmacyAppointment({
    appointmentId,
    patient,
    pharmacy,
    deliveryMode,
    cod,
    onlinePayment,
    otherPatientDetails,
    medicine,
    amount,
    report,
    discription,
    userAddress,
  });

  const savedAppointment = await appointment.save();

  const populatedAppointment = await PharmacyAppointment.findById(
    savedAppointment._id
  )
    .populate(
      "pharmacy",
      "name  onlinePayment cod email phone profileImage address"
    )
    .populate("patient", "phone name gender email accountType address");

  await createNotifications({
    title: "Medicine Order Placed Successfully",
    comment:
      "Your prescription has been submitted and the pharmacy will review and process your medicine order shortly.",
    details: populatedAppointment.toObject(),
    userId: existingPatient._id,
    fcmToken: existingPatient?.fcmToken,
    screen: screen,
  });

  await createNotifications({
    title: "New Prescription Order Received",
    comment: `You have received a new medicine order from ${existingPatient.name}. Please review the prescription and process the order.`,
    details: populatedAppointment.toObject(),
    userId: existingPharmacy._id,
    fcmToken: existingPharmacy?.fcmToken,
    screen: screen,
  });

  res
    .status(201)
    .json(
      new apiResponse(
        201,
        populatedAppointment,
        "Pharmacy appointment created successfully"
      )
    );
});

// Get All Pharmacy Appointments
const getAllPharmacyAppointments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    userId,
    isPagination = "true",
    fromDate,
    toDate,
  } = req.query;

  const match = {};

  if (status) match.status = { $regex: status, $options: "i" };

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    match.$or = [
      { patient: new mongoose.Types.ObjectId(userId), userDelete: false },
      { pharmacy: new mongoose.Types.ObjectId(userId), PharmacyDelete: false },
    ];
  }

  if (fromDate && toDate) {
    const from = new Date(fromDate); // start of fromDate
    const to = new Date(toDate); // start of toDate
    to.setDate(to.getDate() + 1); // next day midnight tak include

    match.createdAt = { $gte: from, $lt: to }; // MongoDB automatically handles Date objects
  }


  let pipeline = [
    { $match: match },

    // Patient lookup with only required fields
    {
      $lookup: {
        from: "users",
        let: { patientId: "$patient" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$patientId"] } } },
          {
            $project: {
              _id: 1,
              name: 1,
              phone: 1,
              email: 1,
              gender: 1,
              age: 1,
            },
          },
        ],
        as: "patient",
      },
    },
    { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },

    // Pharmacy lookup with only required fields
    {
      $lookup: {
        from: "pharmacies",
        let: { pharmacyId: "$pharmacy" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$pharmacyId"] } } },
          {
            $project: {
              _id: 1,
              name: 1,
              phone: 1,
              email: 1,
              address: 1,
              licenseNumber: 1,
            },
          },
        ],
        as: "pharmacy",
      },
    },
    { $unwind: { path: "$pharmacy", preserveNullAndEmptyArrays: true } },
  ];

  // Search filter
  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [
          { "patient.name": { $regex: regex } },
          { "pharmacy.name": { $regex: regex } },
          { appointmentId: { $regex: regex } },
          { "otherPatientDetails.name": { $regex: regex } },
        ],
      },
    });
  }

  // Sort by creation date
  pipeline.push({ $sort: { createdAt: -1 } });

  // Get total count before pagination
  const totalArr = await PharmacyAppointment.aggregate([
    ...pipeline,
    { $count: "count" },
  ]);
  const total = totalArr[0]?.count || 0;

  // Apply pagination if enabled
  if (isPagination === "true") {
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
  }

  // Final query
  const appointments = await PharmacyAppointment.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(
      200,
      {
        appointments,
        totalAppointments: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      "Pharmacy appointments fetched successfully"
    )
  );
});

// Update Pharmacy Appointment
const updatePharmacyAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const appointment = await PharmacyAppointment.findById(id);
  if (!appointment) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  const existingPatient = await User.findById(appointment?.patient);
  const existingPharmacy = await Pharmacy.findById(appointment?.pharmacy);

  // ✅ Validate status based on schema
  const validStatuses = [
    "Pending",
    "Accepted",
    "Confirmed",
    "Packed",
    "In Transit",
    "Delivered",
    "Rejected",
  ];
  if (updateData.status && !validStatuses.includes(updateData.status)) {
    return res.status(400).json(new apiResponse(400, null, "Invalid status"));
  }

  // ✅ Validate delivery mode based on schema
  const validDeliveryModes = ["home", "pickup"];
  if (
    updateData.deliveryMode &&
    !validDeliveryModes.includes(updateData.deliveryMode)
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid delivery mode"));
  }

  // ✅ Validate payment status based on schema
  const validPaymentStatuses = ["Pending", "Completed", "Refunded"];
  if (
    updateData.paymentStatus &&
    !validPaymentStatuses.includes(updateData.paymentStatus)
  ) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid payment status"));
  }

  // Track old values for notifications
  const oldAmount = appointment.amount;
  const oldStatus = appointment.status;
  const oldPaymentStatus = appointment.paymentStatus;

  // Apply updates
  Object.assign(appointment, updateData);

  const updated = await appointment.save();

  /** ---------------- NOTIFICATIONS LOGIC ---------------- **/

  // 1️⃣ Amount updated
  if (updateData.amount && updateData.amount !== oldAmount) {
    await createNotifications({
      title: "Prescription Amount Updated",
      comment: `The pharmacy has updated your prescription amount to ₹${updateData.amount}.`,
      details: updated.toObject(),
      userId: existingPatient._id,
      fcmToken: existingPatient?.fcmToken,
      screen: "Home",
    });
  }

  // 2️⃣ Status changes
  if (updateData.status && updateData.status !== oldStatus) {
    const statusMessages = {
      Confirmed: {
        patient: "Your prescription order has been confirmed by the pharmacy.",
        pharmacy: `You have confirmed the prescription order for ${existingPatient.name}.`,
      },
      Cancelled: {
        patient: "Your prescription order has been cancelled by the pharmacy.",
        pharmacy: `You have cancelled the prescription order for ${existingPatient.name}.`,
      },
      Delivered: {
        patient:
          "Your prescription order has been successfully delivered and payment is confirmed.",
        pharmacy: `You have successfully delivered the order for ${existingPatient.name}.`,
      },
    };

    if (statusMessages[updateData.status]) {
      await createNotifications({
        title: `Prescription Order ${updateData.status}`,
        comment: statusMessages[updateData.status].patient,
        details: updated.toObject(),
        userId: existingPatient._id,
        fcmToken: existingPatient?.fcmToken,
        screen: "Home",
      });

      await createNotifications({
        title: `Prescription Order ${updateData.status}`,
        comment: statusMessages[updateData.status].pharmacy,
        details: updated.toObject(),
        userId: existingPharmacy._id,
        fcmToken: existingPharmacy?.fcmToken,
        screen: "Home",
      });
    }
  }

  // 3️⃣ Completed & Payment Completed
  if (
    updateData.status === "Delivered" &&
    updateData.paymentStatus === "Completed" &&
    (oldStatus !== "Delivered" || oldPaymentStatus !== "Completed")
  ) {
    await createNotifications({
      title: "Order Completed & Payment Received",
      comment:
        "Your prescription order has been successfully delivered and payment is confirmed.",
      details: updated.toObject(),
      userId: existingPatient._id,
      fcmToken: existingPatient?.fcmToken,
      screen: "Home",
    });

    await createNotifications({
      title: "Order Completed & Payment Confirmed",
      comment: `You have successfully completed and received payment for ${existingPatient.name}'s order.`,
      details: updated.toObject(),
      userId: existingPharmacy._id,
      fcmToken: existingPharmacy?.fcmToken,
      screen: "Home",
    });
  }

  res
    .status(200)
    .json(
      new apiResponse(200, updated, "Pharmacy appointment updated successfully")
    );
});

// Delete Appointment
const deletePharmacyAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await PharmacyAppointment.findByIdAndDelete(id);
  if (!deleted) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Appointment not found"));
  }

  res
    .status(200)
    .json(
      new apiResponse(200, null, "Pharmacy appointment deleted successfully")
    );
});

export {
  addPharmacyAppointment,
  getAllPharmacyAppointments,
  updatePharmacyAppointmentStatus,
  deletePharmacyAppointment,
  addPharmacyAppointmentWithPriscription,
  addPharmacyOrderWithPayment,
  verifyDiagnosticPayment,
  addPharmacyOrderWithccavPayment
};
