import { Router } from "express";
import {
  registerUser,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  registerPatients
} from "../controllers/patientController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();


routes.route("/addPatient").post(registerUser);
routes.route("/registerPatients").post(registerPatients);
routes.route("/patients").get(getAllPatients);
routes.route("/patients/:id").get(getPatientById);
routes.route("/patients/:id").patch(updatePatient);

routes.route("/patients/:id").delete(deletePatient);

export default routes;
