import DiagnosticWallet from "../models/diagnosticWalletHistory.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { calculateDiagnosticBalance } from "../utils/calculateDiagnosticBalance.js";
import DiagnosticPayout from "../models/DiagnosticPayout.modal.js";
import DiagnosticNewWallet from "../models/DiagnosticWallet.modal.js";

// Create Diagnostic Wallet Entry
const createDiagnosticWallet = asyncHandler(async (req, res) => {
  const { DiagnosticId, patientId, consultationId, amount, paymentType, note } = req.body;

  if (!DiagnosticId || !patientId || !consultationId || !amount || !paymentType) {
    return res.status(400).json(
      new apiResponse(400, null, "All required fields must be provided.")
    );
  }

  try {
    const walletEntry = new DiagnosticWallet({
      DiagnosticId,
      patientId,
      consultationId,
      amount,
      paymentType,
      note,
    });

    const savedEntry = await walletEntry.save();

    res.status(201).json(
      new apiResponse(201, savedEntry, "Diagnostic wallet entry created successfully")
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get All Diagnostic Wallet Entries
const getAllDiagnosticWallets = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      DiagnosticId,
      paymentType,
      fromDate,
      toDate,
    } = req.query;

    const searchQuery = {};

    if (search) {
      searchQuery.note = { $regex: search, $options: "i" };
    }

    if (DiagnosticId) {
      searchQuery.DiagnosticId = DiagnosticId;
    }

    if (paymentType) {
      searchQuery.paymentType = paymentType;
    }

    if (fromDate || toDate) {
      searchQuery.createdAt = {};
      if (fromDate) {
        searchQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        searchQuery.createdAt.$lte = new Date(
          new Date(toDate).setHours(23, 59, 59, 999)
        );
      }
    }

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const total = await DiagnosticWallet.countDocuments(searchQuery);
      const wallets = await DiagnosticWallet.find(searchQuery)
        .populate({
          path: "DiagnosticId",
          select: "name phone email address licenseId", // customize as per Diagnostic model
        })
        .populate({
          path: "patientId",
          select: "name phone email gender",
        })
        .populate({
          path: "consultationId",
          select: "consultationType date status",
        })
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      return res.status(200).json(
        new apiResponse(
          200,
          {
            wallets,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
          },
          "Wallet entries fetched successfully"
        )
      );
    } else {
      const wallets = await DiagnosticWallet.find(searchQuery)
        .populate("DiagnosticId patientId consultationId")
        .sort({ createdAt: -1 });

      return res.status(200).json(
        new apiResponse(200, wallets, "Wallet entries fetched successfully")
      );
    }
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get Wallet Entry by ID
const getDiagnosticWalletById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await DiagnosticWallet.findById(id).populate(
      "DiagnosticId patientId consultationId"
    );

    if (!wallet) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Wallet entry not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, wallet, "Wallet entry fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update Wallet Entry
const updateDiagnosticWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const wallet = await DiagnosticWallet.findById(id);

    if (!wallet) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Wallet entry not found"));
    }

    Object.keys(updateData).forEach((key) => {
      wallet[key] = updateData[key];
    });

    const updatedWallet = await wallet.save();

    res
      .status(200)
      .json(new apiResponse(200, updatedWallet, "Wallet entry updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete Wallet Entry
const deleteDiagnosticWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await DiagnosticWallet.findByIdAndDelete(id);

    if (!wallet) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Wallet entry not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, null, "Wallet entry deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getDiagnosticWalletDashboard = asyncHandler(async (req, res) => {
  const diagnosticId = req.params.id;

  if (!diagnosticId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Diagnostic ID is required"));
  }

  // 🔹 1️⃣ Calculate balance
  const balanceData = await calculateDiagnosticBalance(diagnosticId);

  // 🔹 2️⃣ Payout history
  const payoutHistory = await DiagnosticPayout.find({
    diagnosticId,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  // 🔹 3️⃣ Recent transactions
  const recentTransactions = await DiagnosticNewWallet.find({
    diagnosticId,
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
      "Diagnostic wallet dashboard fetched successfully"
    )
  );
});

export {
  createDiagnosticWallet,
  getAllDiagnosticWallets,
  getDiagnosticWalletById,
  updateDiagnosticWallet,
  deleteDiagnosticWallet,
  getDiagnosticWalletDashboard,
};
