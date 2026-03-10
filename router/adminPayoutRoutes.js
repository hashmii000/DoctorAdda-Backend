import express from "express";
import {
  generatePayout,
  getPayoutList,
  markPayoutAsPaid,
  generateDiagnosticPayout,
  getDiagnosticPayoutList,
  markDiagnosticPayoutAsPaid,
  getDoctorsWithBalance,
  getDiagnosticsWithBalance,
  generateHospitalPayout,
  getHospitalPayoutList,
  markHospitalPayoutAsPaid,
  getHospitalsWithBalance,
  markHospitalPayoutsAsPaidBulk,
  markDiagnosticPayoutsAsPaidBulk,
  markDoctorPayoutsAsPaidBulk,
  getPlatformEarnings,
  getDoctorsWithBalanceFilter,
  getDiagnosticsWithBalanceFilter,
  getHospitalsWithBalanceFilter,
  getDoctorWalletTransactions,
  getHospitalWalletTransactions,
  getDiagnosticWalletTransactions,
} from "../controllers/adminPayoutController.js";

const router = express.Router();

//  Doctor
router.post("/payout/generate", generatePayout);
router.get("/payouts", getPayoutList);
router.patch("/payout/:payoutId/mark-paid", markPayoutAsPaid);
router.get("/payout/doctors-with-balance", getDoctorsWithBalance);
router.get("/payout/doctors-with-balance-filter", getDoctorsWithBalanceFilter);
router.patch("/payout/mark-paid", markDoctorPayoutsAsPaidBulk);
router.get("/doctor-wallet-transactions/:doctorId",getDoctorWalletTransactions);

//  Diagnostic
router.post("/diagnostic/generate", generateDiagnosticPayout);
router.get("/diagnostic", getDiagnosticPayoutList);
router.patch("/diagnostic/:payoutId/mark-paid", markDiagnosticPayoutAsPaid);
router.get("/payout/diagnostics-with-balance", getDiagnosticsWithBalance);
router.get("/payout/diagnostics-with-balance-filter", getDiagnosticsWithBalanceFilter);
router.patch("/diagnostic/mark-paid", markDiagnosticPayoutsAsPaidBulk);
router.get("/diagnostic-wallet-transactions/:diagnosticId",getDiagnosticWalletTransactions);

//  Hospital
router.post("/hospital/generate", generateHospitalPayout);
router.get("/hospital/", getHospitalPayoutList);
router.patch("/hospital/:payoutId/mark-paid", markHospitalPayoutAsPaid);
router.get("/payout/hospitals-with-balance", getHospitalsWithBalance);
router.get("/payout/hospitals-with-balance-filter", getHospitalsWithBalanceFilter);
router.patch("/hospital/mark-paid", markHospitalPayoutsAsPaidBulk);
router.get("/hospital-wallet-transactions/:hospitalId",getHospitalWalletTransactions);

router.get("/platform-earnings", getPlatformEarnings);

export default router;