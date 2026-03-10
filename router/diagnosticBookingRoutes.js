import { Router } from "express";
import { 
    addDiagnosticAppointment,
    addDiagnosticAppointmentWithPayment,
    verifyDiagnosticPayment,
    getAllDiagnosticAppointments,
    deleteDiagnosticAppointment,
    updateDiagnosticAppointmentStatus,
    addDiagnosticAppointmentWithccavPayment,
} from "../controllers/DiagnosticBookingController.js";

const routes = Router();

routes.route("/add").post(addDiagnosticAppointment);
routes.route("/getAll").get(getAllDiagnosticAppointments);
routes.route("/payment").post(addDiagnosticAppointmentWithPayment);
routes.route("/ccvanuePayment").post(addDiagnosticAppointmentWithccavPayment);
routes.route("/verifyPayment").post(verifyDiagnosticPayment);
routes.route("/delete/:id").delete(deleteDiagnosticAppointment);
routes.route("/update/:id").patch(updateDiagnosticAppointmentStatus);

export default routes;
