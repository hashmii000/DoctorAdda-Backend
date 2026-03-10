import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";

const routes = Router();

routes.route("/").post(createCategory);
routes.route("/").get(getAllCategories);
routes.route("/:id").get(getCategoryById);
routes.route("/:id").patch(updateCategory);
routes.route("/:id").delete(deleteCategory);

export default routes;
