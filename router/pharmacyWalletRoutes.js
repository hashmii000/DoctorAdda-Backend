import { Router } from "express";
import {
  createPharmacyWallet,
  getAllPharmacyWallets,
  getPharmacyWalletById,
  updatePharmacyWallet,
  deletePharmacyWallet,
} from "../controllers/pharmacyWalletController.js";

const routes = Router();

routes
  .route("/")
  .post(createPharmacyWallet)
  .get(getAllPharmacyWallets);

routes
  .route("/:id")
  .get(getPharmacyWalletById)
  .patch(updatePharmacyWallet)
  .delete(deletePharmacyWallet);

export default routes;
