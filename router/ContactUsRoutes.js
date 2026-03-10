import { Router } from "express";
import {
  createContactUs,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact
} from "../controllers/ContactUsController.js";

const routes = Router();

// Create a new contact message
routes.route("/").post(createContactUs);

// Get all contact messages
routes.route("/").get(getAllContacts);

// Get a single contact message by ID
routes.route("/:id").get(getContactById);

// Update a contact message by ID
routes.route("/:id").patch(updateContact);

// Delete a contact message by ID
routes.route("/:id").delete(deleteContact);

export default routes;
