import { decrypt } from "./ccavutil.js";
import Appointment from "../../models/appointment.modal.js";

import DiagnosticAppointment from "../../models/DiagnosticBookingModal.js";

import Diagnostic from "../../models/Diagnostic.modal.js";
import User from "../../models/User.modal.js";
import DiagnosticWallet from "../../models/diagnosticWalletHistory.modal.js";

import crypto from "crypto";
import qs from "querystring";
import { createNotifications } from "../../controllers/notificationController.js";

// live
const workingKey = "242144CFEA6B4926EBFDFDCE294ED69C";
// local
// const workingKey = "12BC2D2A85C6368DC0F7B5B6F043DA11";

export async function postDiagnosticsRes(req, res) {
  try {
    const encResp = req.body.encResp;
    if (!encResp) return res.status(400).send("Missing encResp");

    // Decrypt
    const md5 = crypto.createHash("md5").update(workingKey).digest();
    const keyBase64 = Buffer.from(md5).toString("base64");
    const ivBase64 = Buffer.from([...Array(16).keys()]).toString("base64");

    const ccavResponse = decrypt(encResp, keyBase64, ivBase64);

    // Parse decrypted string
    const data = qs.parse(ccavResponse);

   
    // Fetch appointment
    const appointment = await DiagnosticAppointment.findById(data.order_id);

    console.log("appointment", appointment);

    if (!appointment) return res.status(404).send("Appointment not found");

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




    // Verify and update DB
    if (Number(appointment.fee).toFixed(2) !== Number(data.amount).toFixed(2)) {
      appointment.paymentStatus = "AmountMismatch";
    } else if (data.order_status === "Success") {
      // appointment.status = "Confirmed";
      // appointment.paymentStatus = "Completed";
      // appointment.paymentDetails.transactionId = data.tracking_id;
      // appointment.paymentDetails.paymentDate = new Date();
      // slotToBook.isBooked = true;

      // const actualFee = Number(appointment.amount);
      // existingDiagnostic.wallet += actualFee;

      // await DiagnosticWallet.create({
      //   DiagnosticId: existingDiagnostic._id,
      //   patientId: patient._id,
      //   consultationId: appointment._id,
      //   amount: actualFee,
      //   paymentType: "credited",
      //   note: `Diagnostic service fee credited  on ${new Date().toLocaleDateString()}`,
      // });

      await handleDiagnosticSuccessfulPayment({
        appointment,
        transactionId: data.tracking_id,
        paymentGateway: "CCAvenue",
      });

     // await existingDiagnostic.save();

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
        title: "Appointment Booked  Successfuly",
        comment:
          "Your appointment has been successfully booked. We look forward to seeing you soon!",
        details: populatedAppointment.toObject(),
        userId: patient,
        fcmToken: existingDiagnostic?.fcmToken,
        screen:"Home"
      });
    } else {
      appointment.paymentStatus = data.order_status;
      appointment.paymentDetails.transactionId = data.tracking_id;
      appointment.paymentDetails.paymentDate = new Date();

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
        title: ` Your Payment Has ${data.order_status}`,
        comment: `Your payment could not be completed. Please try again or contact support.`,
        details: populatedAppointment.toObject(),
        userId: patient,
        fcmToken: existingDiagnostic?.fcmToken,
        screen: "Home",
      });
    }

    await appointment.save();

    // Redirect to frontend
    if (data.order_status === "Success") {
      return res.redirect(
        `https://doctorsadda.com/success?order=${appointment._id}`
      );
    } else {
      return res.redirect(
        `https://doctorsadda.com/failed?order=${appointment._id}`
      );
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
}
