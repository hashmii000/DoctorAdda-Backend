
import { Router } from "express";
import { addAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    getAllAppointments,
    addAppointmentWithPayment,
    verifyPayment,
    updateAppointment,
    updateDoctorStatus,
    getAppointmentById,
    getVaccineReminder,
    addPrescription,
    getPrescriptions,
    updatePrescription,
    deletePrescription,
    addAppointmentWithccvanuePayment, } from "../controllers/appointmentController.js";


const routes = Router();

routes.route("/add").post(addAppointment);
routes.route("/payment").post(addAppointmentWithPayment);
routes.route("/ccvanuePayment").post(addAppointmentWithccvanuePayment);
routes.route("/verifyPayment").post(verifyPayment);
routes.route("/getAll").get(getAllAppointments);
routes.route("/vaccine-reminder/:patientId").get(getVaccineReminder);
routes.route("/get/:id").get(getAppointmentById);
routes.route("/delete/:id").delete(deleteAppointment);
routes.route("/update/:id").patch(updateAppointmentStatus);
routes.route("/updateDoctorStatus/:id").patch(updateDoctorStatus);
routes.route("/updateAppointment/:id").patch(updateAppointment);


routes.route("/:appointmentId/prescriptions").post(addPrescription); // Add prescription
routes.route("/:appointmentId/prescriptions").get(getPrescriptions); // Get all prescriptions
routes.route("/:appointmentId/prescriptions/:prescriptionId").put(updatePrescription); // Update prescription
routes.route("/:appointmentId/prescriptions/:prescriptionId").delete(deletePrescription); // Delete prescription




export default routes;