import { Router } from "express";

import { verifyJWT } from "../middlewares/authTypeMiddleware.js";
import {
  createPharmacy,
  getAllPharmacies,
  getPharmacyById,
  updatePharmacy,
  deletePharmacy,
  addReviewToPharmacy,
  updatePharmacyReview,
  deletePharmacyReview,
  registerPharmacy,
  getPharmacyDashboard,
  addMedicineToPharmacy,
  updatePharmacyMedicine,
  deletePharmacyMedicine,
  getFDAMedicines
} from "../controllers/pharmacyController.js";

const routes = Router();


routes.route("/getFDAMedicines")
  .get(getFDAMedicines);

routes.route("/")
  .post(createPharmacy)
  .get(getAllPharmacies);
routes.route("/registerPharmacy/:id")
  .post(registerPharmacy);


// Get / Update / Delete by ID
routes.route("/:id")
  .get(getPharmacyById)
  .patch(updatePharmacy)
  .delete(deletePharmacy);

// Reviews
routes.route("/:id/review")
  .post(verifyJWT, addReviewToPharmacy);

  // dashboard
routes.route("/getPharmacyDashboard/:pharmacyId").get( getPharmacyDashboard);

routes.route("/:pharmacyId/review/:reviewId")
  .put(verifyJWT, updatePharmacyReview)
  .delete(verifyJWT, deletePharmacyReview);


  
// Medicine Routes
routes.route("/:id/medicine")
  .post(addMedicineToPharmacy); // Add medicine

routes.route("/:pharmacyId/medicine/:medicineId")
  .put(updatePharmacyMedicine) // Update medicine
  .delete(deletePharmacyMedicine); // Delete medicine

export default routes;
