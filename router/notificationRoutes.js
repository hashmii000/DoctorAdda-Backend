import { Router } from "express";
import {
  createNotification,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification
} from "../controllers/notificationController.js";

const routes = Router();

routes.route("/").post(createNotification);
routes.route("/").get(getAllNotifications);
routes.route("/:id").get(getNotificationById);
routes.route("/:id").patch(updateNotification);
routes.route("/:id").delete(deleteNotification);

export default routes;
