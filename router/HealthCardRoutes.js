import { Router } from "express";
import {
  createHealthCard,
  getAllHealthCards,
  getHealthCardById,
  updateHealthCard,
  deleteHealthCard
} from "../controllers/HealthCardController.js";

const routes = Router();

routes.route("/").post(createHealthCard);
routes.route("/").get(getAllHealthCards);
routes.route("/:id").get(getHealthCardById);
routes.route("/:id").patch(updateHealthCard);
routes.route("/:id").delete(deleteHealthCard);

export default routes;
