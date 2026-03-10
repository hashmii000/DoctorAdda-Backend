import { Router } from "express";
import {
  createHospital,
  getAllHospitals,
  getHospitalById,
  updateHospital,
  deleteHospital,
  addDoctorToHospital,
  updateDoctorInHospital,
  updateDoctorInHospital1,
  deleteDoctorFromHospital,
  addReviewToHospital,
  updateHospitalReview,
  deleteHospitalReview,
  registerHospital,
  getHospitalDashboard,
  getHospitalsNearMe,
  addRegisteredDoctor,
  getRegisteredDoctors,
  updateRegisteredDoctor,
  deleteRegisteredDoctor,
  addOrUpdateAvailability,
  updateSlotBooking,
  getDoctorAvailability,
  regenerateAvailabilityOfDoctor,
  regenerateAvailabilityOfDoctor1
} from "../controllers/hospitalController.js";
import {
  authorizeUserType,
  verifyJWT,
} from "../middlewares/authTypeMiddleware.js";

const routes = Router();

routes.route("/regenerateAvailability").patch(regenerateAvailabilityOfDoctor);
routes.route("/regenerateAvailability1").patch(regenerateAvailabilityOfDoctor1);
routes.route("/").post(createHospital);
routes.route("/registerHospital/:id").post(registerHospital);
// routes.route("/").get(getHospitalsNearMe);
routes.route("/").get(getAllHospitals);
routes.route("/:id").get(getHospitalById);
routes.route("/:id").patch(updateHospital);
routes.route("/:id").delete(deleteHospital);

routes.route("/getHospitalDashboard/:hospitalId").get(getHospitalDashboard);

routes.route("/:id/doctor").post(addDoctorToHospital);
routes.route("/:hospitalId/doctor/:doctorId").patch(updateDoctorInHospital);
routes.route("/:hospitalId/registeredDoctor/:doctorId").patch(updateDoctorInHospital1);
routes.route("/:hospitalId/doctor/:doctorId").delete(deleteDoctorFromHospital);


routes.route("/:hospitalId/doctors/:doctorId/availability").post(addOrUpdateAvailability);
routes.route("/:hospitalId/doctors/:doctorId/availability").get(getDoctorAvailability);
routes.route("/:hospitalId/doctors/:doctorId/availability/:date/slot").patch(updateSlotBooking);








routes.route("/:id/review").post(verifyJWT, addReviewToHospital);
routes
  .route("/:hospitalId/review/:reviewId")
  .put(verifyJWT, updateHospitalReview);
routes
  .route("/:hospitalId/review/:reviewId")
  .delete(verifyJWT, deleteHospitalReview);

// Registered Doctor Routes
routes
  .route("/:hospitalId/registeredDoctor")
  .post(addRegisteredDoctor)
  .get(getRegisteredDoctors);

routes
  .route("/:hospitalId/registeredDoctor/:doctorId")
  .put(updateRegisteredDoctor)
  .delete(deleteRegisteredDoctor);

export default routes;
