import { Router } from "express";
import {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner
} from "../controllers/bannerController.js";

const routes = Router();

// Create a new banner
routes.route("/").post(createBanner);

// Get all banners (with optional pagination & search)
routes.route("/").get(getAllBanners);

// Get, update, or delete a banner by ID
routes.route("/:id").get(getBannerById).patch(updateBanner).delete(deleteBanner);

export default routes;
