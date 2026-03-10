

import { Router } from "express";
import { searchGlobal } from "../controllers/globalSearchController.js";


const routes = Router();


routes.route("/global-search").get(searchGlobal);







export default routes;
