import { Router } from "express";
import {
  addMemberToUser,
  addOrderAddressToUser,
  addPetsToUser,
  createPassword,
  deleteMemberOfUser,
  deleteOrderAddressOfUser,
  deletePetsOfUser,
  deleteUser,
  getAllMembersOfUser,
  getAllOrderAddressesOfUser,
  getAllPetsOfUser,
  getAllUsers,
  getUserById,
  login,
  loginWithPassword,
  register,
  registerUser,
  resendOtp,
  resetPassword,
  updateMemberOfUser,
  updateOrderAddressOfUser,
  updatePassword,
  updatePetsOfUser,
  updateProfile,
  verifyOtp,
} from "../controllers/authController.js";
import {
  authorizeUserType,
  verifyJWT,
} from "../middlewares/authTypeMiddleware.js";

const routes = Router();

// auth
routes.route("/sendOtp").post(register);
routes.route("/verifyOtp").post(verifyOtp);
routes.route("/login").post(login);
routes.route("/resendOtp").post(resendOtp);

routes.route("/registerUser").post(registerUser);
routes.route("/getAllUsers").get(getAllUsers);
routes.route("/getUserById/:id").get(getUserById);
routes.route("/updateProfile/:id").patch(updateProfile);
routes.route("/delete/:id").delete(deleteUser);

// member
routes.route("/addMember/:userId").post(addMemberToUser);
routes.route("/getMembers/:userId").get(getAllMembersOfUser);
routes.route("/updateMember/:userId/:memberId").patch(updateMemberOfUser);
routes.route("/deleteMember/:userId/:memberId").delete(deleteMemberOfUser);

// orderAddress
routes.route("/addorderAddress/:userId").post(addOrderAddressToUser);
routes.route("/getorderAddress/:userId").get(getAllOrderAddressesOfUser);
routes.route("/updateorderAddress/:userId/:addressId").patch(updateOrderAddressOfUser);
routes.route("/deleteorderAddress/:userId/:addressId").delete(deleteOrderAddressOfUser);

// pets
routes.route("/addpets/:userId").post(addPetsToUser);
routes.route("/getpets/:userId").get(getAllPetsOfUser);
routes.route("/updatepets/:userId/:petsId").patch(updatePetsOfUser);
routes.route("/deletepets/:userId/:petsId").delete(deletePetsOfUser);

routes.route("/loginWithPassword").post(loginWithPassword);
routes.route("/createPassword").post(createPassword);
routes.route("/updatePassword").post(updatePassword);
routes.route("/resetPassword").post(resetPassword);



export default routes;
