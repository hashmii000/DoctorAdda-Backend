import { Router } from "express";
import {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService
} from "../controllers/servicesController.js"; 

const routes = Router();

routes.route("/").post(createService);
routes.route("/").get(getAllServices);
routes.route("/:id").get(getServiceById);
routes.route("/:id").patch(updateService);
routes.route("/:id").delete(deleteService);

export default routes;
