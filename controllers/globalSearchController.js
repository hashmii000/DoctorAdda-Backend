import { asyncHandler } from "../utils/asynchandler.js";
import Doctor from "../models/Doctor.modal.js";
import Hospital from "../models/Hospital.modal.js";
import Ambulance from "../models/Ambulance.modal.js";
import Pharmacy from "../models/Pharmacy.modal.js";
import Diagnostic from "../models/Diagnostic.modal.js";
import { apiResponse } from "../utils/apiResponse.js";

const searchGlobal = asyncHandler(async (req, res) => {
  const { query, latitude, longitude, isApprove = "Approved", radius = 5000 } = req.query;

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radiusInRadians = radius / 1000 / 6378.1;
  const radiusInKm = radius / 1000;

  const words = query
    ? query.trim().split(/\s+/).map((word) => new RegExp(word.replace(/’/g, "'"), 'i'))
    : [];

  // ================== DOCTOR PIPELINE ==================
  const doctorPipeline = [];

  doctorPipeline.push({
    $match: { isApprove },
  });

  // Geo filter
  if (latitude && longitude) {
    doctorPipeline.push({
      $addFields: {
        clinics: {
          $filter: {
            input: "$clinics",
            as: "clinic",
            cond: {
              $lte: [
                {
                  $let: {
                    vars: {
                      lat1: { $arrayElemAt: ["$$clinic.location.coordinates", 1] },
                      lon1: { $arrayElemAt: ["$$clinic.location.coordinates", 0] },
                    },
                    in: {
                      $multiply: [
                        6371,
                        {
                          $acos: {
                            $add: [
                              {
                                $multiply: [
                                  { $cos: { $degreesToRadians: "$$lat1" } },
                                  { $cos: { $degreesToRadians: lat } },
                                  {
                                    $cos: {
                                      $subtract: [
                                        { $degreesToRadians: lng },
                                        { $degreesToRadians: "$$lon1" },
                                      ],
                                    },
                                  },
                                ],
                              },
                              {
                                $multiply: [
                                  { $sin: { $degreesToRadians: "$$lat1" } },
                                  { $sin: { $degreesToRadians: lat } },
                                ],
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
                radiusInKm,
              ],
            },
          },
        },
      },
    });

    doctorPipeline.push({
      $match: {
        "clinics.0": { $exists: true },
      },
    });
  }

  // Populate category
  doctorPipeline.push({
    $lookup: {
      from: "categories",
      localField: "category",
      foreignField: "_id",
      as: "category",
    },
  });

  doctorPipeline.push({
    $unwind: {
      path: "$category",
      preserveNullAndEmptyArrays: true,
    },
  });

  // Search matching
  if (words.length) {
    doctorPipeline.push({
      $match: {
        $or: words.flatMap((regex) => [
          { fullName: { $regex: regex } },
          { phone: { $regex: regex } },
          { email: { $regex: regex } },
          { education: { $regex: regex } },
          { about: { $regex: regex } },
          { experience: { $regex: regex } },
          { serviceType: { $regex: regex } },
          { "category.name": { $regex: regex } },
          { "clinics.clinicName": { $regex: regex } },
          { "clinics.clinicAddress": { $regex: regex } },
        ]),
      },
    });
  }

  // Sort by rating
  doctorPipeline.push({
    $sort: { averageRating: -1 },
  });

  // ================== HOSPITALS ==================
const hospitalPipeline = [];

hospitalPipeline.push({
  $match: { isApprove },
});

// Geo filter
if (lat && lng) {
  hospitalPipeline.push({
    $match: {
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      },
    },
  });
}

// Lookup category
hospitalPipeline.push({
  $lookup: {
    from: "categories",
    localField: "categories",
    foreignField: "_id",
    as: "categories",
  },
});

// Apply search terms
if (words.length) {
  hospitalPipeline.push({
    $match: {
      $or: words.flatMap((regex) => [
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
        { address: { $regex: regex } },
        { description: { $regex: regex } },
        { "facilities.name": { $regex: regex } },
        { "facilities.discription": { $regex: regex } },
        { "doctors.name": { $regex: regex } },
        { "doctors.specialization": { $regex: regex } },
        { "categories.name": { $regex: regex } },
      ]),
    },
  });
}

// Sort by top rated
hospitalPipeline.push({
  $sort: { averageRating: -1 },
});

  // ================== AMBULANCES ==================
const ambulancePipeline = [];

ambulancePipeline.push({
  $match: { isApprove },
});

// Geo filter
if (lat && lng) {
  ambulancePipeline.push({
    $match: {
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      },
    },
  });
}

// Search keywords in name, address, type, etc.
if (words.length) {
  ambulancePipeline.push({
    $match: {
      $or: words.flatMap((regex) => [
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { address: { $regex: regex } },
        { ambulanceType: { $regex: regex } },
        { description: { $regex: regex } },
        { "driverInfo.name": { $regex: regex } },
        { "driverInfo.mobile": { $regex: regex } },
        { "driverInfo.licenseNumber": { $regex: regex } },
      ]),
    },
  });
}

// Sort by rating
ambulancePipeline.push({
  $sort: { averageRating: -1 },
});

  // ================== PHARMACIES ==================
const pharmacyPipeline = [];

pharmacyPipeline.push({
  $match: { isApprove },
});

// Geo filter
if (lat && lng) {
  pharmacyPipeline.push({
    $match: {
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      },
    },
  });
}

// Search keywords in name, address, services, etc.
if (words.length) {
  pharmacyPipeline.push({
    $match: {
      $or: words.flatMap((regex) => [
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
        { address: { $regex: regex } },
        { description: { $regex: regex } },
        { "services.name": { $regex: regex } },
        { "ownerDetails.name": { $regex: regex } },
      ]),
    },
  });
}

// Sort by rating (highest first)
pharmacyPipeline.push({
  $sort: { averageRating: -1 },
});


  // ================== Diagnostic ==================
const diagnosticPipeline = [];

diagnosticPipeline.push({
  $match: { isApprove },
});

// Geo filter
if (lat && lng) {
  diagnosticPipeline.push({
    $match: {
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians],
        },
      },
    },
  });
}

// Search keywords in name, address, services, etc.
if (words.length) {
  diagnosticPipeline.push({
    $match: {
      $or: words.flatMap((regex) => [
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
        { address: { $regex: regex } },
        { description: { $regex: regex } },
        { "services.name": { $regex: regex } },
        { "packages.name": { $regex: regex } },
        { "packages.details": { $regex: regex } },
        { "ownerDetails.name": { $regex: regex } },
      ]),
    },
  });
}

// Sort by rating (highest first)
diagnosticPipeline.push({
  $sort: { averageRating: -1 },
});

  // ================== EXECUTE ==================
  const [doctors, hospitals, ambulances, pharmacies,diagnostics] = await Promise.all([
    Doctor.aggregate(doctorPipeline),
    Hospital.aggregate(hospitalPipeline),
    Ambulance.aggregate(ambulancePipeline),
    Pharmacy.aggregate(pharmacyPipeline),
    Diagnostic.aggregate(diagnosticPipeline),
  ]);

  res.status(200).json(
    new apiResponse(
      200,
      { doctors, hospitals, ambulances, pharmacies,diagnostics },
      "Global search results"
    )
  );
});

export { searchGlobal };
