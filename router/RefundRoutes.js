import { Router } from "express";
import {
  createRefund,
  getAllRefunds,
  getRefundById,
  updateRefund,
  deleteRefund,
  getRefundsByUser,
} from "../controllers/RefundController.js";

const routes = Router();

// 🟢 Create a new refund
routes.route("/").post(createRefund);

// 🟡 Get all refunds (with pagination, search, status, userId filter)
routes.route("/").get(getAllRefunds);

// 🟠 Get all refunds by a specific user
routes.route("/user/:userId").get(getRefundsByUser);

// 🔵 Get refund by ID
routes.route("/:id").get(getRefundById);

// 🟣 Update refund by ID
routes.route("/:id").patch(updateRefund);

// 🔴 Delete refund by ID
routes.route("/:id").delete(deleteRefund);

export default routes;
