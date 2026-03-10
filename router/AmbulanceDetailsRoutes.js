import { Router } from "express";
import {
  createAmbulanceDetail,
  getAllAmbulanceDetails,
  getAmbulanceDetailById,
  updateAmbulanceDetail,
  deleteAmbulanceDetail,
} from "../controllers/AmbulanceDetailsController.js";

const routes = Router();

routes.route("/").post(createAmbulanceDetail);

routes.route("/").get(getAllAmbulanceDetails);

routes.route("/:id").get(getAmbulanceDetailById);

routes.route("/:id").patch(updateAmbulanceDetail);

routes.route("/:id").delete(deleteAmbulanceDetail);

export default routes;
