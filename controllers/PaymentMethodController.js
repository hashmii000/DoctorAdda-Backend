import PaymentMethod from "../models/PaymentMethod.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const createPaymentMethod = asyncHandler(async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Payment method title is required."));
  }

  try {
    // Step 1: Deactivate all existing payment methods
    await PaymentMethod.updateMany({}, { active: false });

    // Step 2: Create new payment method as active
    const paymentMethod = new PaymentMethod({ title, active: true });
    const savedPaymentMethod = await paymentMethod.save();

    res
      .status(201)
      .json(
        new apiResponse(
          201,
          savedPaymentMethod,
          "New payment method created and set as active. All others deactivated."
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getAllPaymentMethods = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      active,
    } = req.query;

    const searchQuery = {};

    // 🔍 Filter by search text (title)
    if (search) {
      searchQuery.$or = [{ title: { $regex: search, $options: "i" } }];
    }

    // ✅ Filter by active status if provided
    if (active === "true") {
      searchQuery.active = true;
    } else if (active === "false") {
      searchQuery.active = false;
    }

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const totalPaymentMethods = await PaymentMethod.countDocuments(
        searchQuery
      );
      const paymentMethods = await PaymentMethod.find(searchQuery)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }); // optional: newest first

      res.status(200).json(
        new apiResponse(
          200,
          {
            paymentMethods,
            totalPaymentMethods,
            totalPages: Math.ceil(totalPaymentMethods / limit),
            currentPage: Number(page),
          },
          "Payment methods fetched successfully"
        )
      );
    } else {
      const paymentMethods = await PaymentMethod.find(searchQuery).sort({
        createdAt: -1,
      });
      res
        .status(200)
        .json(
          new apiResponse(
            200,
            paymentMethods,
            "Payment methods fetched successfully"
          )
        );
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const getPaymentMethodById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Payment method not found"));
    }

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          paymentMethod,
          "Payment method fetched successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const updatePaymentMethod = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Payment method not found"));
    }

    // 🟢 If this update sets `active: true`, deactivate all others first
    if (updateData.active === true) {
      await PaymentMethod.updateMany({ _id: { $ne: id } }, { active: false });
    }

    // 🔄 Update only provided fields
    Object.keys(updateData).forEach((key) => {
      paymentMethod[key] = updateData[key];
    });

    const updatedPaymentMethod = await paymentMethod.save();

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedPaymentMethod,
          updateData.active === true
            ? "Payment method activated and others deactivated successfully"
            : "Payment method updated successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

const deletePaymentMethod = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Payment method not found"));
    }

    // 🛑 Prevent deleting active payment method
    if (paymentMethod.active) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Cannot delete an active payment method. Please activate another method first."
          )
        );
    }

    // ✅ Safe to delete inactive method
    await PaymentMethod.findByIdAndDelete(id);

    res
      .status(200)
      .json(new apiResponse(200, null, "Payment method deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createPaymentMethod,
  getAllPaymentMethods,
  getPaymentMethodById,
  updatePaymentMethod,
  deletePaymentMethod,
};
