import { Router } from "express";
import { createShowIntrest, deleteShowIntrest, getAllShowIntrests, getShowIntrestById, updateShowIntrest } from "../controllers/showIntrestController.js";


const routes = Router();

routes.route("/").post(createShowIntrest);         
routes.route("/").get(getAllShowIntrests);         
routes.route("/:id").get(getShowIntrestById);      
routes.route("/:id").patch(updateShowIntrest);     
routes.route("/:id").delete(deleteShowIntrest);    

export default routes;
