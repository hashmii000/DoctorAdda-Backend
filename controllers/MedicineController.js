import Medicine from "../models/Medicine.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create a new Medicine
const createMedicine = asyncHandler(async (req, res) => {
  const { generic_name, brand_names, pack_size, medical_system } = req.body;

  console.log("generic_name, brand_names, pack_size, medical_system", generic_name, brand_names, pack_size, medical_system);


  // 🔍 Validation
  if (!generic_name || !brand_names) {
    return res.status(400).json(
      new apiResponse(
        400,
        null,
        "Generic name, brand name, pack size and medical system are required."
      )
    );
  }

  try {
    // 🧠 Normalize values
    const normalizedGenericName = generic_name.trim().toLowerCase();
    const normalizedBrandName = brand_names.trim().toLowerCase();

    // 🔁 Check duplicate
    const existingMedicine = await Medicine.findOne({
      generic_name: normalizedGenericName,
      brand_names: normalizedBrandName,
    });

    if (existingMedicine) {
      return res.status(400).json(
        new apiResponse(
          400,
          null,
          "Medicine with this generic name and brand already exists."
        )
      );
    }

    // ✅ Create medicine
    const medicine = new Medicine({
      generic_name: normalizedGenericName,
      brand_names: normalizedBrandName,
      pack_size,
      medical_system,
    });

    const savedMedicine = await medicine.save();

    return res.status(201).json(
      new apiResponse(201, savedMedicine, "Medicine created successfully.")
    );
  } catch (error) {
    return res.status(500).json(
      new apiResponse(500, null, error.message)
    );
  }
});

const bulkCreateMedicines = asyncHandler(async (req, res) => {
  const medicines = req.body.medicines;

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty medicine data array"));
  }

  try {
    const uniqueMedicines = medicines.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.generic_name?.trim().toLowerCase() === item.generic_name?.trim().toLowerCase() &&
            t.brand_names?.trim().toLowerCase() ===
            item.brand_names?.trim().toLowerCase()
        )
    );

    // 🔹 Define batch size (tune as per your server capacity)
    const BATCH_SIZE = 1000;
    const total = uniqueMedicines.length;
    let insertedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = uniqueMedicines.slice(i, i + BATCH_SIZE);

      try {
        const inserted = await Medicine.insertMany(batch, {
          ordered: false, // continue on errors
        });
        insertedCount += inserted.length;
      } catch (batchError) {
        console.error("Batch insert error:", batchError.message);
        failedCount += batch.length;
      }
    }

    res.status(201).json(
      new apiResponse(
        201,
        {
          totalRecords: total,
          insertedCount,
          failedCount,
        },
        `${insertedCount} medicines inserted successfully (out of ${total})`
      )
    );
  } catch (error) {
    console.error("Bulk insert error:", error);
    res
      .status(500)
      .json(new apiResponse(500, null, `Bulk insert error: ${error.message}`));
  }
});

// Get all Medicines (with optional pagination & search)
const getAllMedicines = asyncHandler(async (req, res) => {
  try {
    const { isPagination = "true", page = 1, limit = 10, search } = req.query;

    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { generic_name: { $regex: search, $options: "i" } },
        { brand_names: { $regex: search, $options: "i" } },
        { pack_size: { $regex: search, $options: "i" } },
        { keywords_synonyms: { $regex: search, $options: "i" } },
        { strength: { $regex: search, $options: "i" } },
        { primary_specialty: { $regex: search, $options: "i" } },
        { secondary_specialties: { $regex: search, $options: "i" } },
        { medical_system: { $regex: search, $options: "i" } },
      ];
    }

    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const totalMedicines = await Medicine.countDocuments(searchQuery);
      const medicines = await Medicine.find(searchQuery)
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json(
        new apiResponse(
          200,
          {
            medicines,
            totalMedicines,
            totalPages: Math.ceil(totalMedicines / limit),
            currentPage: Number(page),
          },
          "Medicines fetched successfully"
        )
      );
    } else {
      const medicines = await Medicine.find(searchQuery);
      res
        .status(200)
        .json(
          new apiResponse(200, medicines, "Medicines fetched successfully")
        );
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get a Medicine by ID
const getMedicineById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Medicine not found"));
    }
    res
      .status(200)
      .json(new apiResponse(200, medicine, "Medicine fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a Medicine by ID
const updateMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Medicine not found"));
    }

    Object.keys(updateData).forEach((key) => {
      medicine[key] = updateData[key];
    });

    const updatedMedicine = await medicine.save();
    res
      .status(200)
      .json(
        new apiResponse(200, updatedMedicine, "Medicine updated successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete a Medicine by ID
const deleteMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const medicine = await Medicine.findByIdAndDelete(id);
    if (!medicine) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Medicine not found"));
    }
    res
      .status(200)
      .json(new apiResponse(200, null, "Medicine deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createMedicine,
  bulkCreateMedicines,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
};
