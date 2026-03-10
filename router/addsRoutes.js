import { Router } from "express";
import {
  createAdd,
  getAllAdds,
  getAddById,
  updateAdd,
  deleteAdd
} from "../controllers/addsController.js";

const routes = Router();

routes.route("/").post(createAdd);          // Create Add
routes.route("/").get(getAllAdds);          // Get all Adds
routes.route("/:id").get(getAddById);       // Get Add by ID
routes.route("/:id").patch(updateAdd);      // Update Add
routes.route("/:id").delete(deleteAdd);     // Delete Add

export default routes;
