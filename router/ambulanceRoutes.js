import { Router } from "express";
import {
  registerAmbulance,
  getAllAmbulances,
  updateAmbulance,
  deleteAmbulance,
  registerAmbulances,
  addReviewToAmbulance,
  updateAmbulanceReview,
  deleteAmbulanceReview,
  getAmbulanceById,
  getAmbulanceDashboard,
  addAmbulanceVehicle,
  updateAmbulanceVehicle,
  deleteAmbulanceVehicle,
} from "../controllers/ambulanceController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";
import { addReviewToDoctor, deleteDoctorReview, updateDoctorReview } from "../controllers/doctorController.js";

const routes = Router();



routes.route("/registerAmbulances/:id").post(registerAmbulances)
routes.route("/").post(registerAmbulance)
routes.route("/").get(getAllAmbulances)
routes.route("/:id").get(getAmbulanceById)
routes.route("/:id").patch(updateAmbulance)
routes.route("/:id").delete(deleteAmbulance)
routes.route("/getAmbulanceDashboard/:ambulanceId").get(getAmbulanceDashboard)



routes.route("/:id/review").post(verifyJWT, addReviewToAmbulance);
routes.route("/:ambulanceId/review/:reviewId").put(verifyJWT, updateAmbulanceReview);
routes.route("/:ambulanceId/review/:reviewId").delete(verifyJWT, deleteAmbulanceReview);
routes.route("/:ambulanceId/review/:reviewId").delete(verifyJWT, deleteAmbulanceReview);

// add ambulance
routes.route("/:id/vehicles").post( addAmbulanceVehicle);
routes.route("/:ambulanceId/vehicles/:vehicleId").put( updateAmbulanceVehicle);
routes.route("/:ambulanceId/vehicles/:vehicleId").delete( deleteAmbulanceVehicle);





export default routes;
