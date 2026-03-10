import { Router } from "express";
import { getDashboard } from "../controllers/adminController.js";



const routes = Router();
routes.route("/adminDashboard").get( getDashboard);
export default routes;

