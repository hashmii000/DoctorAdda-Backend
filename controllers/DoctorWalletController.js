import DoctorWallet from "../models/DoctorWalletHistory.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { calculateDoctorBalance } from "../utils/calculateDoctorBalance.js";
import DoctorPayout from "../models/DoctorPayout.modal.js";
import DoctorNewWallet from "../models/DoctorWallet.modal.js";

// Create Doctor Wallet Entry
const createDoctorWallet = asyncHandler(async (req, res) => {
  const { doctorId, patientId, consultationId, amount, paymentType, note } =
    req.body;

  if (!doctorId || !patientId || !consultationId || !amount || !paymentType) {
    return res
      .status(400)
      .json(
        new apiResponse(400, null, "All required fields must be provided.")
      );
  }

  try {
    const walletEntry = new DoctorWallet({
      doctorId,
      patientId,
      consultationId,
      amount,
      paymentType,
      note,
    });

    const savedEntry = await walletEntry.save();

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          savedEntry,
          "Doctor wallet entry created successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get All Doctor Wallet Entries
const getAllDoctorWallets = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      doctorId,
      paymentType,
      fromDate,
      toDate,
    } = req.query;

    const searchQuery = {};

    // Search by note
    if (search) {
      searchQuery.note = { $regex: search, $options: "i" };
    }

    // Filter by doctorId
    if (doctorId) {
      searchQuery.doctorId = doctorId;
    }

    // Filter by paymentType
    if (paymentType) {
      searchQuery.paymentType = paymentType;
    }

    // Filter by createdAt date range
    if (fromDate || toDate) {
      searchQuery.createdAt = {};
      if (fromDate) {
        searchQuery.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Set end of the day for toDate
        searchQuery.createdAt.$lte = new Date(
          new Date(toDate).setHours(23, 59, 59, 999)
        );
      }
    }

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const total = await DoctorWallet.countDocuments(searchQuery);
      const wallets = await DoctorWallet.find(searchQuery)
        .populate({
          path: "doctorId",
          select:
            "fullName email phone profilepic gender about education specialization", // only these fields will be shown
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
      const wallets = await DoctorWallet.find(searchQuery)
        .populate("doctorId patientId consultationId")
        .sort({ createdAt: -1 });

      return res
        .status(200)
        .json(
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
const getDoctorWalletById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await DoctorWallet.findById(id).populate(
      "doctorId patientId consultationId"
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
const updateDoctorWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const wallet = await DoctorWallet.findById(id);

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
      .json(
        new apiResponse(200, updatedWallet, "Wallet entry updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete Wallet Entry
const deleteDoctorWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await DoctorWallet.findByIdAndDelete(id);

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

const getDoctorWalletDashboard = asyncHandler(async (req, res) => {
  const doctorId = req.params.id; // IMPORTANT

  if (!doctorId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Doctor ID is required"));
  }

  const balanceData = await calculateDoctorBalance(doctorId);

  const payoutHistory = await DoctorPayout.find({ doctorId })
    .sort({ createdAt: -1 })
    .limit(10);

  const recentTransactions = await DoctorNewWallet.find({ doctorId })
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
       // recentTransactions,
      },
      "Doctor wallet dashboard fetched successfully"
    )
  );
}); 

export {
  createDoctorWallet,
  getAllDoctorWallets,
  getDoctorWalletById,
  updateDoctorWallet,
  deleteDoctorWallet,
  getDoctorWalletDashboard,
};
