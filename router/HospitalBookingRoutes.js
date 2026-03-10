// routes/HospitalBookingRoutes.js
import { Router } from "express";
import {
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
} from "../controllers/hospitalAppointmentController.js";

const routes = Router();

// Create new hospital appointment (without payment)
routes.route("/add").post(addHospitalAppointment);

// Get all hospital appointments
routes.route("/getAll").get(getAllHospitalAppointments);

// Create new hospital appointment with payment
routes.route("/payment").post(addHospitalAppointmentWithPayment);
routes.route("/ccvanuePayment").post(addHospitalAppointmentWithccavPayment);

// Verify hospital payment
routes.route("/verifyPayment").post(verifyHospitalPayment);

// Update appointment status
routes.route("/update/:id").patch(updateHospitalAppointmentStatus);

// Delete appointment
routes.route("/delete/:id").delete(deleteHospitalAppointment);


routes.route("/:appointmentId/prescriptions").post(addPrescription); // Add prescription
routes.route("/:appointmentId/prescriptions").get(getPrescriptions); // Get all prescriptions
routes.route("/:appointmentId/prescriptions/:prescriptionId").put(updatePrescription); // Update prescription
routes.route("/:appointmentId/prescriptions/:prescriptionId").delete(deletePrescription); // Delete prescription






export default routes;
