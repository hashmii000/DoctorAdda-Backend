import { decrypt } from "./ccavutil.js";
import Appointment from "../../models/appointment.modal.js";

import User from "../../models/User.modal.js";

import HospitalAppointment from "../../models/HospitalAppointment.modal.js";
import Hospital from "../../models/Hospital.modal.js";

import HospitalWallet from "../../models/HospitalWalletHistory.modal.js";

import crypto from "crypto";
import qs from "querystring";
import { createNotifications } from "../../controllers/notificationController.js";

// live
const workingKey = "242144CFEA6B4926EBFDFDCE294ED69C";
// local
// const workingKey = "12BC2D2A85C6368DC0F7B5B6F043DA11";

export async function postHospitalRes(req, res) {
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
    const appointment = await HospitalAppointment.findById(data.order_id);

    if (!appointment) return res.status(404).send("Appointment not found");

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

    // Verify and update DB
    if (Number(appointment.fee).toFixed(2) !== Number(data.amount).toFixed(2)) {
      appointment.paymentStatus = "AmountMismatch";
    } else if (data.order_status === "Success") {
      // appointment.status = "Confirmed";
      // appointment.paymentStatus = "Completed";
      // appointment.paymentDetails.transactionId = data.tracking_id;
      // appointment.paymentDetails.paymentDate = new Date();
      // const actualFee = Number(appointment.fee);
      // existingHospital.wallet += actualFee;

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
        transactionId: data.tracking_id,
        paymentGateway: "CCAvenue",
      });

      slotToBook.isBooked = true;
    //  await existingHospital.save();

      // await appointment.save();

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

      await createNotifications({
        title: "Appointment Booked  Successfuly",
        comment:
          "Your appointment has been successfully booked. We look forward to seeing you soon!",
        details: populatedAppointment.toObject(),
        userId: patient,
        // fcmToken: `eVspgGgzTyKj_ljsQ107LC:APA91bGdQFWrcC1AZooQ3KGvF47ZNlNOgC1BSlU_N8U1vfZhum02xJwhp6mqwLTx5Xr8j_pMQVWZvXOfn9Rs3vGWWu9Ldo1ALcjwQXppHIRpblFI41zsSaA`,
        fcmToken: existingHospital?.fcmToken,
        screen: "Home",
      });
    } else {
      appointment.paymentStatus = data.order_status;
      appointment.paymentDetails.transactionId = data.tracking_id;
      appointment.paymentDetails.paymentDate = new Date();

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

      console.log("populatedAppointment", populatedAppointment);
      await createNotifications({
        title: ` Your Payment Has ${data.order_status}`,
        comment: `Your payment could not be completed. Please try again or contact support.`,
        details: populatedAppointment.toObject(),
        userId: patient,
        fcmToken: existingHospital?.fcmToken,
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
