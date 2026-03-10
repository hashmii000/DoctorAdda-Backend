import { Router } from "express";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

import {
  createDiagnostic,
  getAllDiagnostics,
  getDiagnosticById,
  updateDiagnostic,
  deleteDiagnostic,
  addReviewToDiagnostic,
  updateDiagnosticReview,
  deleteDiagnosticReview,
  registerDiagnostic,
  getDiagnosticDashboard,
  regenerateAvailabilityOfDiagnostic,
  regenerateAvailability,
  addBloodBank,
  updateBloodBank,
  deleteBloodBank,
} from "../controllers/diagnosticController.js";

const routes = Router();

// Create & Get all diagnostics
routes.route("/registerDiagnostic/:id").post(registerDiagnostic);
routes.route("/").post(createDiagnostic).get(getAllDiagnostics);

routes
  .route("/regenerateAvailabilityOfDiagnostic")
  .patch(regenerateAvailabilityOfDiagnostic);

routes.route("/regenerateAvailability").patch(regenerateAvailability);

// Get / Update / Delete diagnostic by ID

routes
  .route("/:id")
  .get(getDiagnosticById)
  .patch(updateDiagnostic)
  .delete(deleteDiagnostic);

routes
  .route("/getDiagnosticDashboard/:diagnosticId")
  .get(getDiagnosticDashboard);

// Add Review
routes.route("/:id/review").post(verifyJWT, addReviewToDiagnostic);
// Update / Delete Review
routes
  .route("/:diagnosticId/review/:reviewId")
  .put(verifyJWT, updateDiagnosticReview)
  .delete(verifyJWT, deleteDiagnosticReview);

routes.route("/:id/boodbank").post(verifyJWT, addBloodBank);
routes
  .route("/:diagnosticId/boodbank/:bloodBankId")
  .put(verifyJWT, updateBloodBank)
  .delete(verifyJWT, deleteBloodBank);

export default routes;
