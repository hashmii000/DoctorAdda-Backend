import { decrypt } from "./ccavutil.js";
import Appointment from "../../models/appointment.modal.js";
import Doctor from "../../models/Doctor.modal.js";
import User from "../../models/User.modal.js";
import DoctorWallet from "../../models/DoctorWalletHistory.modal.js";
import { handleSuccessfulPayment } from "../../utils/paymentSuccessHandler.js";

import crypto from "crypto";
import qs from "querystring";
import { createNotifications } from "../../controllers/notificationController.js";

// live
const workingKey = "242144CFEA6B4926EBFDFDCE294ED69C";
// local
// const workingKey = "12BC2D2A85C6368DC0F7B5B6F043DA11";

export async function postRes(req, res) {
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

    console.log("data", data);

    // Fetch appointment
    const appointment = await Appointment.findById(data.order_id);

    console.log("appointment", appointment);

    if (!appointment) return res.status(404).send("Appointment not found");

    const date = appointment?.date;
    const slots = appointment?.slots;

    const clinicName = appointment?.clinicName;
    const serviceType = appointment?.serviceType;

    const existingDoctor = await Doctor.findById(appointment?.doctor);
    const patient = await User.findById(appointment?.patient);

    console.log("patient", patient);

    if (!existingDoctor) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Doctor not found"));
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

    // Verify and update DB
    if (Number(appointment.fee).toFixed(2) !== Number(data.amount).toFixed(2)) {
      appointment.paymentStatus = "AmountMismatch";
    } else if (data.order_status === "Success") {
      // appointment.status = "Confirmed";
      // appointment.paymentStatus = "Completed";
      // appointment.paymentDetails.transactionId = data.tracking_id;
      // appointment.paymentDetails.paymentDate = new Date();
      // const actualFee = Number(appointment.fee);
      // existingDoctor.wallet += actualFee;

      // await DoctorWallet.create({
      //   doctorId: existingDoctor._id,
      //   patientId: patient._id,
      //   consultationId: appointment._id,
      //   amount: actualFee,
      //   paymentType: "credited",
      //   note: `Consultation fee credited for ${serviceType} on ${new Date().toLocaleDateString()}`,
      // });  
      await handleSuccessfulPayment({
        appointment,
        transactionId: data.tracking_id,
        paymentGateway: "CCAvenue",
      });

      slotToBook.isBooked = true;
     // await existingDoctor.save();

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
        title: "Appointment Booked  Successfuly",
        comment:
          "Your appointment has been successfully booked. We look forward to seeing you soon!",
        details: populatedAppointment.toObject(),
        userId: patient,
        // fcmToken: `eVspgGgzTyKj_ljsQ107LC:APA91bGdQFWrcC1AZooQ3KGvF47ZNlNOgC1BSlU_N8U1vfZhum02xJwhp6mqwLTx5Xr8j_pMQVWZvXOfn9Rs3vGWWu9Ldo1ALcjwQXppHIRpblFI41zsSaA`,
        fcmToken: existingDoctor?.fcmToken,
        screen: "Home",
      });
    } else {
      appointment.paymentStatus = data.order_status;
      appointment.paymentDetails.transactionId = data.tracking_id;
      appointment.paymentDetails.paymentDate = new Date();

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
        title: ` Your Payment Has ${data.order_status}`,
        comment: `Your payment could not be completed. Please try again or contact support.`,
        details: populatedAppointment.toObject(),
        userId: patient,
        fcmToken: existingDoctor?.fcmToken,
        // fcmToken: `eVspgGgzTyKj_ljsQ107LC:APA91bGdQFWrcC1AZooQ3KGvF47ZNlNOgC1BSlU_N8U1vfZhum02xJwhp6mqwLTx5Xr8j_pMQVWZvXOfn9Rs3vGWWu9Ldo1ALcjwQXppHIRpblFI41zsSaA`,
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
