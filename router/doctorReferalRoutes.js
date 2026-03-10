import { Router } from "express";
import {
  createDoctorReferral,
  getAllDoctorReferrals,
  getDoctorReferralById,
  updateDoctorReferral,
  deleteDoctorReferral
} from "../controllers/doctorReferalController.js";

const routes = Router();

routes.route("/").post(createDoctorReferral);
routes.route("/").get(getAllDoctorReferrals);
routes.route("/:id").get(getDoctorReferralById);
routes.route("/:id").patch(updateDoctorReferral);
routes.route("/:id").delete(deleteDoctorReferral);

export default routes;
