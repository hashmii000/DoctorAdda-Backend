import { Router } from "express";
import {  chat } from "../controllers/chatController.js";

const routes = Router();


routes.route("/").post(chat);



export default routes;
