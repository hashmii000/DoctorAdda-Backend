import { Router } from "express";
import {
  addPharmacyAppointment,
  getAllPharmacyAppointments,
  updatePharmacyAppointmentStatus,
  deletePharmacyAppointment,
  addPharmacyAppointmentWithPriscription,
  addPharmacyOrderWithPayment,
  verifyDiagnosticPayment,
  addPharmacyOrderWithccavPayment
} from "../controllers/pharmacybookingController.js";

const routes = Router();

// Add new appointment
routes.route("/payment").post(addPharmacyOrderWithPayment);
routes.route("/ccvanuePayment").post(addPharmacyOrderWithccavPayment);
routes.route("/payment/verify").post(verifyDiagnosticPayment);
routes.route("/add").post(addPharmacyAppointment);
routes.route("/addWithPriscription").post(addPharmacyAppointmentWithPriscription);

// Get all appointments
routes.route("/getAll").get(getAllPharmacyAppointments);

// Update appointment status or payment status
routes.route("/update/:id").patch(updatePharmacyAppointmentStatus);

// Delete appointment
routes.route("/delete/:id").delete(deletePharmacyAppointment);

export default routes;
