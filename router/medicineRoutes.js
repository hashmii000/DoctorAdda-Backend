import { Router } from "express";
import {
  createMedicine,
  bulkCreateMedicines,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
} from "../controllers/MedicineController.js";

const routes = Router();

// ✅ Create a new medicine
routes.route("/").post(createMedicine);

// ✅ Bulk upload medicines
routes.route("/bulk").post(bulkCreateMedicines);

// ✅ Get all medicines (with pagination & search)
routes.route("/").get(getAllMedicines);

// ✅ Get, update, or delete a single medicine by ID
routes
  .route("/:id")
  .get(getMedicineById)
  .patch(updateMedicine)
  .delete(deleteMedicine);

export default routes;
