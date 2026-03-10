import PharmacyWallet from "../models/pharmacyWalletHistory.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create Pharmacy Wallet Entry
const createPharmacyWallet = asyncHandler(async (req, res) => {
  const { PharmacyId, patientId, consultationId, amount, paymentType, note } = req.body;

  if (!PharmacyId || !patientId || !consultationId || !amount || !paymentType) {
    return res.status(400).json(
      new apiResponse(400, null, "All required fields must be provided.")
    );
  }

  try {
    const walletEntry = new PharmacyWallet({
      PharmacyId,
      patientId,
      consultationId,
      amount,
      paymentType,
      note,
    });

    const savedEntry = await walletEntry.save();

    res.status(201).json(
      new apiResponse(201, savedEntry, "Pharmacy wallet entry created successfully")
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get All Pharmacy Wallet Entries
const getAllPharmacyWallets = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      PharmacyId,
      paymentType,
      fromDate,
      toDate,
    } = req.query;

    const searchQuery = {};

    if (search) {
      searchQuery.note = { $regex: search, $options: "i" };
    }

    if (PharmacyId) {
      searchQuery.PharmacyId = PharmacyId;
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
      const total = await PharmacyWallet.countDocuments(searchQuery);
      const wallets = await PharmacyWallet.find(searchQuery)
        .populate({
          path: "PharmacyId",
          select: "name phone email address licenseId", // adjust based on your Pharmacy model
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
      const wallets = await PharmacyWallet.find(searchQuery)
        .populate("PharmacyId patientId consultationId")
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
const getPharmacyWalletById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await PharmacyWallet.findById(id).populate(
      "PharmacyId patientId consultationId"
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
const updatePharmacyWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const wallet = await PharmacyWallet.findById(id);

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
const deletePharmacyWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await PharmacyWallet.findByIdAndDelete(id);

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

export {
  createPharmacyWallet,
  getAllPharmacyWallets,
  getPharmacyWalletById,
  updatePharmacyWallet,
  deletePharmacyWallet,
};
