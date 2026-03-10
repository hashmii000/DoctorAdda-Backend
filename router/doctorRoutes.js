import { Router } from "express";
import {
  registerDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  registerDoctors,
  addReviewToDoctor,
  updateDoctorReview,
  deleteDoctorReview,
  addClinic,
  updateSlot,
  regenerateAvailability,
  updateClinicDetails,
  getDoctorDashboard,
  regenerateAvailabilityOfClinic,
  getAllAvilableDoctors,
} from "../controllers/doctorController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";
import { updateDoctorWallet } from "../controllers/doctorPayoutController.js";

const routes = Router();

routes.route("/registers/:id").post(registerDoctors);
routes.route("/register/clinic").post(addClinic);
routes.route("/update/slot").patch(updateSlot);
routes.route("/regenerateAvailability").patch(regenerateAvailability);

routes.route("/regenerateAvailabilityOfClinic").patch(regenerateAvailabilityOfClinic);

routes.route("/doctors").get(getAllDoctors);
routes.route("/avilableDoctors").get(getAllAvilableDoctors);
routes.route("/:id").get(getDoctorById);
routes.route("/doctors/:id").patch(updateDoctor);
routes.route("/doctors/:id").delete(deleteDoctor);
routes.route("/:doctorId/clinic/:clinicId").patch(updateClinicDetails);
routes.route("/:id/review").post(verifyJWT,addReviewToDoctor); 
routes.route("/:doctorId/review/:reviewId").put(verifyJWT,updateDoctorReview); 
routes.route("/:doctorId/review/:reviewId").delete(verifyJWT,deleteDoctorReview); 
routes.route("/getDoctorDashboard/:doctorId").get(getDoctorDashboard); 
// routes.route("/register").post(registerDoctor);


routes.route("/updateDoctorWallet").post(updateDoctorWallet); 








export default routes;
