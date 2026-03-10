import { Router } from "express";
import {
  createRecentLocationSearch,
  getAllRecentLocationSearches,
  getRecentLocationSearchById,
  updateRecentLocationSearch,
  deleteRecentLocationSearch,
} from "../controllers/RecentLocationSearchController.js";

const routes = Router();

// Create a new recent location search
routes.route("/").post(createRecentLocationSearch);

// Get all recent location searches (with optional pagination & search)
routes.route("/").get(getAllRecentLocationSearches);

// Get, update, or delete a recent location search by ID
routes
  .route("/:id")
  .get(getRecentLocationSearchById)
  .patch(updateRecentLocationSearch)
  .delete(deleteRecentLocationSearch);

export default routes;
