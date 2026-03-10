import { Router } from "express";
import { registerEntity } from "../controllers/preLaunchController.js";


const routes = Router();

routes.route("/").post(registerEntity);

export default routes;
