import { Router } from "express";
import {
  createDiagnosticWallet,
  getAllDiagnosticWallets,
  getDiagnosticWalletById,
  updateDiagnosticWallet,
  deleteDiagnosticWallet,
  getDiagnosticWalletDashboard,
} from "../controllers/diagnosticWalletController.js";

const routes = Router();

routes.get("/wallet/:id", getDiagnosticWalletDashboard);

routes
  .route("/")
  .post(createDiagnosticWallet)
  .get(getAllDiagnosticWallets);

routes
  .route("/:id")
  .get(getDiagnosticWalletById)
  .patch(updateDiagnosticWallet)
  .delete(deleteDiagnosticWallet);

export default routes;
