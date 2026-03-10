import HospitalWallet from "../models/HospitalWalletHistory.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { calculateHospitalBalance } from "../utils/calculateHospitalBalance.js";
import HospitalPayout from "../models/HospitalPayout.modal.js";
import HospitalNewWallet from "../models/HospitalNewWallet.modal.js";


// Create Hospital Wallet Entry
const createHospitalWallet = asyncHandler(async (req, res) => {
  const { HospitalId, patientId, consultationId, amount, paymentType, note } = req.body;

  if (!HospitalId || !patientId || !consultationId || !amount || !paymentType) {
    return res.status(400).json(
      new apiResponse(400, null, "All required fields must be provided.")
    );
  }

  try {
    const walletEntry = new HospitalWallet({
      HospitalId,
      patientId,
      consultationId,
      amount,
      paymentType,
      note,
    });

    const savedEntry = await walletEntry.save();

    res.status(201).json(
      new apiResponse(201, savedEntry, "Hospital wallet entry created successfully")
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get All Hospital Wallet Entries
const getAllHospitalWallets = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      HospitalId,
      paymentType,
      fromDate,
      toDate,
    } = req.query;

    const searchQuery = {};

    if (search) {
      searchQuery.note = { $regex: search, $options: "i" };
    }

    if (HospitalId) {
      searchQuery.HospitalId = HospitalId;
    }

    if (paymentType) {
      searchQuery.paymentType = paymentType;
    }

    if (fromDate || toDate) {
      searchQuery.createdAt = {};
      if (fromDate) searchQuery.createdAt.$gte = new Date(fromDate);
      if (toDate) searchQuery.createdAt.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
    }

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const total = await HospitalWallet.countDocuments(searchQuery);
      const wallets = await HospitalWallet.find(searchQuery)
        .populate("HospitalId", "name email phone address")
        .populate("patientId", "name email phone gender")
        .populate("consultationId", "consultationType date status")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      return res.status(200).json(
        new apiResponse(200, {
          wallets,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        }, "Wallet entries fetched successfully")
      );
    } else {
      const wallets = await HospitalWallet.find(searchQuery)
        .populate("HospitalId patientId consultationId")
        .sort({ createdAt: -1 });

      return res.status(200).json(
        new apiResponse(200, wallets, "Wallet entries fetched successfully")
      );
    }
  } catch (error) {
    return res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get Wallet Entry by ID
const getHospitalWalletById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await HospitalWallet.findById(id)
      .populate("HospitalId patientId consultationId");

    if (!wallet) {
      return res.status(404).json(new apiResponse(404, null, "Wallet entry not found"));
    }

    res.status(200).json(new apiResponse(200, wallet, "Wallet entry fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update Wallet Entry
const updateHospitalWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const wallet = await HospitalWallet.findById(id);

    if (!wallet) {
      return res.status(404).json(new apiResponse(404, null, "Wallet entry not found"));
    }

    Object.keys(updateData).forEach((key) => {
      wallet[key] = updateData[key];
    });

    const updatedWallet = await wallet.save();

    res.status(200).json(new apiResponse(200, updatedWallet, "Wallet entry updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete Wallet Entry
const deleteHospitalWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await HospitalWallet.findByIdAndDelete(id);

    if (!wallet) {
      return res.status(404).json(new apiResponse(404, null, "Wallet entry not found"));
    }

    res.status(200).json(new apiResponse(200, null, "Wallet entry deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getHospitalWalletDashboard = asyncHandler(async (req, res) => {
  const hospitalId = req.params.id;

  if (!hospitalId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Hospital ID is required"));
  }

  // 🔹 1️⃣ Calculate balance
  const balanceData = await calculateHospitalBalance(hospitalId);

  // 🔹 2️⃣ Payout history
  const payoutHistory = await HospitalPayout.find({
    hospitalId,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  // 🔹 3️⃣ Recent transactions
  const recentTransactions = await HospitalNewWallet.find({
    hospitalId,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        balance: balanceData.balance,
        totalCredit: balanceData.totalCredit,
        totalDebit: balanceData.totalDebit,
        payoutHistory,
        recentTransactions,
      },
      "Hospital wallet dashboard fetched successfully"
    )
  );
});

export {
  createHospitalWallet,
  getAllHospitalWallets,
  getHospitalWalletById,
  updateHospitalWallet,
  deleteHospitalWallet,
  getHospitalWalletDashboard,
};
