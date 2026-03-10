import { Router } from "express";
import {
  createPaymentMethod,
  getAllPaymentMethods,
  getPaymentMethodById,
  updatePaymentMethod,
  deletePaymentMethod,
} from "../controllers/PaymentMethodController.js";

const routes = Router();

routes.route("/").post(createPaymentMethod); // Create a new payment method
routes.route("/").get(getAllPaymentMethods); // Get all payment methods
routes.route("/:id").get(getPaymentMethodById); // Get a payment method by ID
routes.route("/:id").patch(updatePaymentMethod); // Update a payment method
routes.route("/:id").delete(deletePaymentMethod); // Delete a payment method

export default routes;
