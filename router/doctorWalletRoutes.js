import { Router } from "express";
import {
  createDoctorWallet,
  getAllDoctorWallets,
  getDoctorWalletById,
  updateDoctorWallet,
  deleteDoctorWallet,
  getDoctorWalletDashboard,
} from "../controllers/DoctorWalletController.js";

const routes = Router();

routes.get("/wallet/:id", getDoctorWalletDashboard);

routes.route("/")
  .post(createDoctorWallet)
  .get(getAllDoctorWallets);

routes.route("/:id")
  .get(getDoctorWalletById)
  .patch(updateDoctorWallet)
  .delete(deleteDoctorWallet);

 

export default routes;
