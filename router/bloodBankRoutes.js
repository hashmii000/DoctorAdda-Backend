import { Router } from "express";
import {
    registerBloodBank,
    getAllBloodBanks,
    getBloodBankById,
    updateBloodBank,
    deleteBloodBank,
    setAvailability,
    updateAvailability,
    deleteAvailability,
    registerBloodBanks,
    addReviewToBloodBank,
    updateBloodBankReview,
    deleteBloodBankReview
} from "../controllers/bloodBankController.js";
import { verifyJWT } from "../middlewares/authTypeMiddleware.js";

const routes = Router();

routes.route("/add").post(registerBloodBank);
routes.route("/registerBloodBanks").post(registerBloodBanks);
routes.route("/getAll").get(getAllBloodBanks);
routes.route("/getById/:id").get(getBloodBankById);
routes.route("/update/:id").patch(updateBloodBank);
routes.route("/delete/:id").delete(deleteBloodBank);
routes.route("/bloodBanks/:id/availability").post(setAvailability);
routes.route("/bloodBanks/:id/availability").patch(updateAvailability);
routes.route("/bloodBanks/:id/availability").delete(deleteAvailability);


routes.route("/:id/review")
  .post(verifyJWT, addReviewToBloodBank);

routes.route("/:bloodBankId/review/:reviewId")
  .patch(verifyJWT, updateBloodBankReview)
  .delete(verifyJWT, deleteBloodBankReview);



export default routes;
