import { Router } from "express";
import {
  createFacilitie,
  getAllFacilitie,
  getFacilitieById,
  updateFacilitie,
  deleteFacilitie
} from "../controllers/FacilitieController.js";

const routes = Router();

routes.route("/").post(createFacilitie);
routes.route("/").get(getAllFacilitie);
routes.route("/:id").get(getFacilitieById);
routes.route("/:id").patch(updateFacilitie);
routes.route("/:id").delete(deleteFacilitie);

export default routes;
