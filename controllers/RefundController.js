import Refund from "../models/Refund.modal.js";

import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// 🟢 Create a new Refund
const createRefund = asyncHandler(async (req, res) => {
  const {
    userId,
    appointmentType,
    appointmentId,
    paymentId,
    amount,
    refundReason,
    refundStatus,
    refundMessage,
    refundDate,
    imageUrl,
  } = req.body;

  // Required fields list
  const requiredFields = {
    userId,
    appointmentType,
    appointmentId,
    paymentId,
    amount,
    refundReason,
  };

  // Find which fields are missing
  const missingFields = Object.entries(requiredFields)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new apiResponse(
          400,
          null,
          `Missing required field(s): ${missingFields.join(", ")}`
        )
      );
  }

  try {
    const refund = new Refund({
      userId,
      appointmentType,
      appointmentId,
      paymentId,
      amount,
      refundReason,
      refundStatus,
      refundMessage,
      refundDate,
      imageUrl,
    });

    const savedRefund = await refund.save();

    res
      .status(201)
      .json(new apiResponse(201, savedRefund, "Refund created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟡 Get all refunds (with pagination + search + filter)
const getAllRefunds = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      status,
      userId, // ✅ new filter added
    } = req.query;

    const searchQuery = {};

    // 🔹 Search by reason, message, or type
    if (search) {
      searchQuery.$or = [
        { refundReason: { $regex: search, $options: "i" } },
        { refundMessage: { $regex: search, $options: "i" } },
        { appointmentType: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 Filter by refund status
    if (status) {
      searchQuery.refundStatus = status;
    }

    // 🔹 Filter by userId (if provided)
    if (userId) {
      searchQuery.userId = userId;
    }

    // 🔹 Handle Pagination
    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const totalRefunds = await Refund.countDocuments(searchQuery);

      const refunds = await Refund.find(searchQuery)
        .populate("userId", "name email")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      res.status(200).json(
        new apiResponse(
          200,
          {
            refunds,
            totalRefunds,
            totalPages: Math.ceil(totalRefunds / limit),
            currentPage: Number(page),
          },
          "Refunds fetched successfully"
        )
      );
    } else {
      const refunds = await Refund.find(searchQuery)
        .populate("userId", "name email")
        .sort({ createdAt: -1 });

      res
        .status(200)
        .json(new apiResponse(200, refunds, "Refunds fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔵 Get refund by ID
const getRefundById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const refund = await Refund.findById(id).populate("userId", "name email");

    if (!refund) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Refund not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, refund, "Refund fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟣 Update refund (admin can change status or message)
const updateRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const refund = await Refund.findById(id);

    if (!refund) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Refund not found"));
    }

    Object.keys(updateData).forEach((key) => {
      refund[key] = updateData[key];
    });

    const updatedRefund = await refund.save();

    res
      .status(200)
      .json(new apiResponse(200, updatedRefund, "Refund updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔴 Delete refund
const deleteRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const refund = await Refund.findByIdAndDelete(id);

    if (!refund) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Refund not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, null, "Refund deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟠 (Optional) Get refunds by user
const getRefundsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const refunds = await Refund.find({ userId }).sort({ createdAt: -1 });

    if (!refunds.length) {
      return res
        .status(404)
        .json(new apiResponse(404, [], "No refunds found for this user"));
    }

    res
      .status(200)
      .json(new apiResponse(200, refunds, "User refunds fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createRefund,
  getAllRefunds,
  getRefundById,
  updateRefund,
  deleteRefund,
  getRefundsByUser,
};
