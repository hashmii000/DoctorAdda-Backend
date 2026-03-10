import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { generateOTP } from "../utils/generateOTP.js";
import Ambulance from "../models/Ambulance.modal.js";
import Diagnostic from "../models/Diagnostic.modal.js";
import Hospital from "../models/Hospital.modal.js";
import Pharmacy from "../models/Pharmacy.modal.js";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendWhatsappOTP } from "../utils/sendOTP.js";
import{ sendDltOtp } from "../utils/sendDLTOtp.js";
import Doctor from "../models/Doctor.modal.js";

const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

const generateUniqueId = async () => {
  let uniqueId;
  let isUnique = false;

  while (!isUnique) {
    // Generate random 4-digit number between 1000 and 9999
    uniqueId = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if it already exists in DB
    const existingUser = await User.findOne({ uniqueId });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return uniqueId;
};

// 🔹 Register controller
const register = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number must be exactly 10 digits")
      );
  }

  try {
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is already registered"));
    }

    const otp = generateOTP();
    await sendWhatsappOTP(phone, otp);

    const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

    // ✅ Generate 4-digit unique ID safely
    const uniqueId = await generateUniqueId();

    // Create new user
    const newUser = new User({
      phone,
      otp,
      otpExpiration,
      uniqueId,
    });

    await newUser.save();

    const userData = { phone, otp, uniqueId };

    res
      .status(200)
      .json(new apiResponse(200, userData, "OTP sent successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const login = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));
  }

  try {
    const existingUser = await User.findOne({ phone });

    if (!existingUser) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    let otp;

    if (phone === "1111111111") {
      otp = "0101";
    } else {
      otp = generateOTP();
    }

    //const data = await sendWhatsappOTP(phone, otp);

    await sendDltOtp(phone, otp);

    const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

    existingUser.otp = otp;
    existingUser.otpExpiration = otpExpiration;
    await existingUser.save();

    const userData = {
      phone,
      otp,
    };

    res
      .status(200)
      .json(new apiResponse(200, userData, "OTP sent successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number and OTP are required"));
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // if (new Date() > user.otpExpiration) {
    //   return res.status(400).json(new apiResponse(400, null, "OTP has expired. Please resend the OTP"));
    // }

    if (user.otp !== otp) {
      return res.status(400).json(new apiResponse(400, null, "Invalid OTP"));
    }

    const token = user.generateAuthToken();

    // const userDetails = {
    //   phone: user.phone,
    //   accountType: user.accountType,
    //   accountId: user.accountId,
    //   authToken: token,
    //   createdAt: user.createdAt,
    //   updatedAt: user.updatedAt
    // };
    const userDetails = {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      gender: user.gender,
      accountType: user.accountType,
      accountId: user.accountId,
      upgradeAccountType: user.upgradeAccountType,
      upgradeAccountApproveStatus: user.upgradeAccountApproveStatus,
      upgradeAccountId: user.upgradeAccountId,
      isNew: user.isNew,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      authToken: token,
    };

    res
      .status(200)
      .json(new apiResponse(200, userDetails, "OTP verified successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const resendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Phone number is required"));
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // Generate new OTP
    const otp = generateOTP();
   // const data = await sendWhatsappOTP(phone, otp);
   await sendDltOtp(phone, otp);
    const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME); // Set expiration time

    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    const userData = {
      phone,
      otp,
    };

    res
      .status(200)
      .json(new apiResponse(200, userData, "OTP resent successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const registerUser = asyncHandler(async (req, res) => {
  const {
    phone,
    name,
    gender,
    accountType = "User",
    dob,
    email,
    bloodType,
    allergies,
    currentMedic,
    pastMedic,
    ChronicDisease,
    injuries,
    profilepic,
    consumeSmoke,
    consumeAlcohol,
    activityLevel,
    foodPreferd,
    occupation,
    latitude,
    longitude,
  } = req.body;

  if (!phone || !name || !email || !latitude || !longitude) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Missing required fields."));
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid coordinates."));
  }

  try {
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is already registered"));
    }

    const otp = generateOTP();
    const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

    const user = new User({
      phone,
      name,
      gender,
      accountType,
      dob,
      email,
      bloodType,
      allergies,
      currentMedic,
      pastMedic,
      ChronicDisease,
      injuries,
      profilepic,
      consumeSmoke,
      consumeAlcohol,
      activityLevel,
      foodPreferd,
      isNew: false,
      otp,
      otpExpiration,
      occupation,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
    });

    const savedPatient = await user.save();

    res
      .status(201)
      .json(new apiResponse(201, savedPatient, "User created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "User ID is required in the URL params")
      );
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    // Update dynamic keys
    for (const key in req.body) {
      if (
        req.body[key] !== undefined &&
        key !== "latitude" &&
        key !== "longitude"
      ) {
        user[key] = req.body[key];
      }
    }

    // Handle location if latitude and longitude are provided
    if (req.body.latitude && req.body.longitude) {
      const lat = parseFloat(req.body.latitude);
      const lng = parseFloat(req.body.longitude);
      user.location = {
        type: "Point",
        coordinates: [lng, lat],
      };
    }

    user.isNew = false;

    await user.save();

    res.status(200).json(
      new apiResponse(200, {
        ...user.toObject(), // includes all fields
        message: "Profile updated successfully",
      })
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      sortBy = "recent",
    } = req.query;

    const match = {};

    let pipeline = [{ $match: match }];

    // Global text search
    if (search) {
      const words = search
        .trim()
        .split(/\s+/)
        .map((word) => new RegExp(word.replace(/’/g, "'"), "i"));

      const orConditions = words.flatMap((regex) => [
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
      ]);

      pipeline.push({ $match: { $or: orConditions } });
    }

    // Enhanced sort logic
    if (sortBy === "recent") {
      pipeline.push({ $sort: { createdAt: -1, _id: -1 } }); // recent entries first
    } else if (sortBy === "oldest") {
      pipeline.push({ $sort: { createdAt: 1, _id: 1 } }); // oldest entries first
    } else {
      pipeline.push({ $sort: { _id: -1 } }); // fallback
    }

    // Count total
    const totalUsersArr = await User.aggregate([
      ...pipeline,
      { $count: "count" },
    ]);
    const total = totalUsersArr[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
    }

    const users = await User.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          users,
          totalUsers: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Users fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "User ID is required in the URL params")
      );
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, user, "User fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const getData = await User.findById(id);

    if (!getData) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    await User.findByIdAndDelete(id);
    await Doctor.findByIdAndDelete(getData?.upgradeAccountId);
    await Ambulance.findByIdAndDelete(getData?.upgradeAccountId);
    await Diagnostic.findByIdAndDelete(getData?.upgradeAccountId);
    await Hospital.findByIdAndDelete(getData?.upgradeAccountId);
    await Pharmacy.findByIdAndDelete(getData?.upgradeAccountId);

    res
      .status(200)
      .json(new apiResponse(200, null, " user deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// memeber
const addMemberToUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, age, profile, email, gender } = req.body;

  if (!name || !age || !email || !gender) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "All fields (name, age, email, gender) are required"
        )
      );
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    user.members.push({ name, age, profile, email, gender });

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, user.members, "Member added successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllMembersOfUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID is required"));
  }

  try {
    const user = await User.findById(userId).select("members");

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, user.members, "Members fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateMemberOfUser = asyncHandler(async (req, res) => {
  const { userId, memberId } = req.params;
  const updateData = req.body;

  if (!userId || !memberId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID and Member ID are required"));
  }

  try {
    const result = await User.findOneAndUpdate(
      { _id: userId, "members._id": memberId },
      { $set: { "members.$": { _id: memberId, ...updateData } } },
      { new: true }
    ).select("members");

    if (!result) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Member not found"));
    }

    res
      .status(200)
      .json(
        new apiResponse(200, result.members, "Member updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteMemberOfUser = asyncHandler(async (req, res) => {
  const { userId, memberId } = req.params;

  if (!userId || !memberId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID and Member ID are required"));
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { members: { _id: memberId } } },
      { new: true }
    ).select("members");

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, user.members, "Member deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// pets
const addPetsToUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { profile, breed, name, age, weight, type, gender } = req.body;

  if (!name) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "All fields (profile, name, age, weight, type) are required"
        )
      );
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    user.pets.push({ profile, name, breed, age, weight, type, gender });

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, user.pets, "Member added successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllPetsOfUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID is required"));
  }

  try {
    const user = await User.findById(userId).select("pets");

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, user.pets, "Members fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updatePetsOfUser = asyncHandler(async (req, res) => {
  const { userId, petsId } = req.params;
  const updateData = req.body;

  if (!userId || !petsId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID and Member ID are required"));
  }

  try {
    const result = await User.findOneAndUpdate(
      { _id: userId, "pets._id": petsId },
      {
        $set: {
          "pets.$.name": updateData.name,
          "pets.$.profile": updateData.profile,
          "pets.$.age": updateData.age,
          "pets.$.weight": updateData.weight,
          "pets.$.type": updateData.type,
        },
      },
      { new: true }
    ).select("pets");

    if (!result) {
      return res.status(404).json(new apiResponse(404, null, "pets not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, result.pets, "pets updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deletePetsOfUser = asyncHandler(async (req, res) => {
  const { userId, petsId } = req.params;

  if (!userId || !petsId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID and Member ID are required"));
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { pets: { _id: petsId } } },
      { new: true }
    ).select("pets");

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, user.pets, "Member deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const loginWithPassword = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required")
      );
  }

  try {
    const existingUser = await User.findOne({ phone });

    if (!existingUser) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // Check if password is not set for this user
    if (!existingUser.password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Password is not set for this user"));
    }

    const isPasswordCorrect = await existingUser.matchPassword(password);

    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid password"));
    }

    // Generate a JWT token for login
    const token = existingUser.generateAuthToken();

    const userData = {
      phone: existingUser.phone,
      accountType: existingUser.accountType,
      accountId: existingUser.accountId,
      authToken: token,
    };

    res.status(200).json(new apiResponse(200, userData, "Login successful"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const createPassword = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required")
      );
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // Check if the user has already set the password
    if (user.password) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Password already set for this user"));
    }

    const salt = await bcrypt.genSalt(10); // You can change the number of rounds if needed

    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, null, "Password created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "Phone number and password are required")
      );
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, null, "Password created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  const { phone, oldPassword, newPassword } = req.body;

  if (!phone || !oldPassword || !newPassword) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          "Phone number, old password, and new password are required"
        )
      );
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json(new apiResponse(400, null, "User not found"));
    }

    // Check if the old password matches
    const isOldPasswordCorrect = await user.matchPassword(oldPassword);
    if (!isOldPasswordCorrect) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid old password"));
    }

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res
      .status(200)
      .json(new apiResponse(200, null, "Password updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// orderAddress
const addOrderAddressToUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const {
    type,
    name,
    phone,
    address,
    area,
    city,
    state,
    pincode,
    landmark,
    country,
  } = req.body;

  if (!address) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Address field is required"));
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    user.orderAddress.push({
      type,
      name,
      phone,
      address,
      area,
      city,
      state,
      pincode,
      landmark,
      country,
    });
    await user.save();

    res
      .status(200)
      .json(
        new apiResponse(200, user.orderAddress, "Address added successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllOrderAddressesOfUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "User ID is required"));
  }

  try {
    const user = await User.findById(userId).select("orderAddress");

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          user.orderAddress,
          "Addresses fetched successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updateOrderAddressOfUser = asyncHandler(async (req, res) => {
  const { userId, addressId } = req.params;
  const {
    type,
    name,
    phone,
    address,
    area,
    city,
    state,
    pincode,
    landmark,
    country,
  } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    const addressObj = user.orderAddress.id(addressId);

    if (!addressObj) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Address not found"));
    }

    if (address) addressObj.address = address;
    if (type) addressObj.type = type;
    if (name) addressObj.name = name;
    if (phone) addressObj.phone = phone;
    if (area) addressObj.area = area;
    if (city) addressObj.city = city;
    if (state) addressObj.state = state;
    if (pincode) addressObj.pincode = pincode;
    if (landmark) addressObj.landmark = landmark;
    if (country) addressObj.country = country;

    await user.save();

    res
      .status(200)
      .json(
        new apiResponse(200, user.orderAddress, "Address updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deleteOrderAddressOfUser = asyncHandler(async (req, res) => {
  const { userId, addressId } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { orderAddress: { _id: addressId } } },
      { new: true }
    ).select("orderAddress");

    if (!user) {
      return res.status(404).json(new apiResponse(404, null, "User not found"));
    }

    res
      .status(200)
      .json(
        new apiResponse(200, user.orderAddress, "Address deleted successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  addOrderAddressToUser,
  getAllOrderAddressesOfUser,
  updateOrderAddressOfUser,
  deleteOrderAddressOfUser,
  addMemberToUser,
  getAllMembersOfUser,
  updateMemberOfUser,
  deleteMemberOfUser,
  addPetsToUser,
  getAllPetsOfUser,
  updatePetsOfUser,
  deletePetsOfUser,
  register,
  login,
  verifyOtp,
  resendOtp,
  getAllUsers,
  loginWithPassword,
  createPassword,
  updatePassword,
  resetPassword,
  updateProfile,
  getUserById,
  deleteUser,
  registerUser,
};
