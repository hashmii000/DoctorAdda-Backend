import Doctor from "../models/Doctor.modal.js";
import Ambulance from "../models/Ambulance.modal.js";
import Diagnostic from "../models/Diagnostic.modal.js";
import Hospital from "../models/Hospital.modal.js";
import Pharmacy from "../models/Pharmacy.modal.js";
import { apiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asynchandler.js';

const getDashboard = asyncHandler(async (req, res) => {
  const [
    doctorStats,
    hospitalStats,
    ambulanceStats,
    diagnosticStats,
    pharmacyStats,

  ] = await Promise.all([
    Doctor.aggregate([
      {
        $group: {
          _id: "$isApprove",
          count: { $sum: 1 }
        }
      }
    ]),
    Hospital.aggregate([
      {
        $group: {
          _id: "$isApprove",
          count: { $sum: 1 }
        }
      }
    ]),
    Ambulance.aggregate([
      {
        $group: {
          _id: "$isApprove",
          count: { $sum: 1 }
        }
      }
    ]),
    Diagnostic.aggregate([
      {
        $group: {
          _id: "$isApprove",
          count: { $sum: 1 }
        }
      }
    ]),
    Pharmacy.aggregate([
      {
        $group: {
          _id: "$isApprove",
          count: { $sum: 1 }
        }
      }
    ]),

  ]);

  const formatStats = (stats) => ({
    Approved: stats.find(i => i._id === "Approved")?.count || 0,
    NotApprove: stats.find(i => i._id === "NotApprove")?.count || 0,
    
  });

  return res.status(200).json(new apiResponse(200,  {
    doctors: formatStats(doctorStats),
    hospitals: formatStats(hospitalStats),
    ambulances: formatStats(ambulanceStats),
    diagnostics: formatStats(diagnosticStats),
    pharmacies: formatStats(pharmacyStats),

  },"Admin dashboard data fetched successfully"));
});

export {
  getDashboard
};
