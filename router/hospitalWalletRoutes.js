import { Router } from "express";
import {
  createHospitalWallet,
  getAllHospitalWallets,
  getHospitalWalletById,
  updateHospitalWallet,
  deleteHospitalWallet,
  getHospitalWalletDashboard,
} from "../controllers/hospitalWalletControllers.js";

const routes = Router();

routes.get("/wallet/:id", getHospitalWalletDashboard);

routes
  .route("/")
  .post(createHospitalWallet)
  .get(getAllHospitalWallets);

routes
  .route("/:id")
  .get(getHospitalWalletById)
  .patch(updateHospitalWallet)
  .delete(deleteHospitalWallet);

export default routes;
