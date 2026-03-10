import Doctor from "../models/Doctor.modal.js";
import DoctorNewWallet from "../models/DoctorWallet.modal.js";
import DoctorPayout from "../models/DoctorPayout.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import DiagnosticNewWallet from "../models/DiagnosticWallet.modal.js";
import DiagnosticPayout from "../models/DiagnosticPayout.modal.js";
import Diagnostic from "../models/Diagnostic.modal.js";
import Hospital from "../models/Hospital.modal.js";
import HospitalNewWallet from "../models/HospitalNewWallet.modal.js";
import HospitalPayout from "../models/HospitalPayout.modal.js";
import PlatformEarning from "../models/PlatformEarning.modal.js";


import mongoose from "mongoose";

// Doctor pay out controller - generate payout, list payouts, mark as paid

export const generatePayout = asyncHandler(async (req, res) => {
  const { doctorIds = [], fromDate, toDate } = req.body;

  if (!fromDate || !toDate) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "fromDate and toDate are required"));
  }

  // get doctors
  const doctors =
    doctorIds.length > 0
      ? await Doctor.find({ _id: { $in: doctorIds } })
      : await Doctor.find({ isActive: true });

  if (!doctors.length) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "No doctors found"));
  }

  const payouts = [];

  for (const doctor of doctors) {
    // fetch unpaid wallet entries
    const walletEntries = await DoctorNewWallet.find({
      doctorId: doctor._id,
      type: "credit",
      status: "available",
      createdAt: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      },
    });

    if (!walletEntries.length) continue;

    // const payableAmount = walletEntries.reduce(
    //   (sum, w) => sum + w.amount,
    //   0
    // );

    const payableAmount = Number(
      walletEntries.reduce((sum, w) => sum + w.amount, 0).toFixed(2)
    );

    // create payout snapshot
    const payout = await DoctorPayout.create({
      doctorId: doctor._id,
      fromDate,
      toDate,
      totalAppointments: walletEntries.length,
      grossAmount: payableAmount,
      platformFee: 0, // already deducted earlier
      payableAmount,
      status: "pending",
    });

    // lock wallet entries
    await DoctorNewWallet.updateMany(
      { _id: { $in: walletEntries.map(w => w._id) } },
      { status: "paid" }
    );

    payouts.push(payout);
  }

  return res.status(200).json(
    new apiResponse(
      200,
      payouts,
      `Payout generated for ${payouts.length} doctor(s)`
    )
  );
});

export const getPayoutList = asyncHandler(async (req, res) => {
  const {
    doctorId,
    status,
    fromDate,
    toDate,
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};

  if (doctorId) filter.doctorId = doctorId;
  if (status) filter.status = status;

  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  // Get total count
  const totalCount = await DoctorPayout.countDocuments(filter);

  // Fetch paginated data
  const payouts = await DoctorPayout.find(filter)
    .populate("doctorId", "fullName email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page: pageNumber,
        limit: pageLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
        payouts,
      },
      "Payout list fetched"
    )
  );
});

export const getDoctorsWithBalance = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const skip = (page - 1) * limit;

  // 1️⃣ Aggregate wallet with pagination
  const walletSummary = await DoctorNewWallet.aggregate([
    {
      $match: {
        type: "credit",
        status: "available",
      },
    },
    {
      $group: {
        _id: "$doctorId",
        totalBalance: { $sum: "$amount" },
        totalEntries: { $sum: 1 },
      },
    },
    {
      $match: {
        totalBalance: { $gt: 0 },
      },
    },
    {
      $sort: { totalBalance: -1 }, // optional sorting
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const totalCount = walletSummary[0]?.metadata[0]?.total || 0;
  const paginatedData = walletSummary[0]?.data || [];

  const doctorIds = paginatedData.map(w => w._id);

  const doctors = await Doctor.find({ _id: { $in: doctorIds } })
    .select("fullName email phone");

  const response = doctors.map(doc => {
    const wallet = paginatedData.find(
      w => w._id.toString() === doc._id.toString()
    );

    return {
      doctorId: doc._id,
      fullName: doc.fullName,
      email: doc.email,
      phone: doc.phone,
      totalBalance: wallet?.totalBalance || 0,
      totalAppointments: wallet?.totalEntries || 0,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        response,
      },
      "Doctors with wallet balance fetched"
    )
  );
});

export const getDoctorsWithBalanceFilter = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;

  const skip = (page - 1) * limit;

  // 🟢 Build date filter dynamically
  let dateFilter = {};

  if (fromDate || toDate) {
    dateFilter.createdAt = {};

    if (fromDate) {
      dateFilter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      // include full day
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.createdAt.$lte = endDate;
    }
  }

  // 1️⃣ Aggregate wallet with pagination
  const walletSummary = await DoctorNewWallet.aggregate([
    {
      $match: {
        type: "credit",
        status: "available",
        ...dateFilter, // 👈 Added here
      },
    },
    {
      $group: {
        _id: "$doctorId",
        totalBalance: { $sum: "$amount" },
        totalEntries: { $sum: 1 },
      },
    },
    {
      $match: {
        totalBalance: { $gt: 0 },
      },
    },
    {
      $sort: { totalBalance: -1 },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const totalCount = walletSummary[0]?.metadata[0]?.total || 0;
  const paginatedData = walletSummary[0]?.data || [];

  const doctorIds = paginatedData.map(w => w._id);

  const doctors = await Doctor.find({ _id: { $in: doctorIds } })
    .select("fullName email phone");

  const response = doctors.map(doc => {
    const wallet = paginatedData.find(
      w => w._id.toString() === doc._id.toString()
    );

    return {
      doctorId: doc._id,
      fullName: doc.fullName,
      email: doc.email,
      phone: doc.phone,
      totalBalance: wallet?.totalBalance || 0,
      totalAppointments: wallet?.totalEntries || 0,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        fromDate: fromDate || null,
        toDate: toDate || null,
        response,
      },
      "Doctors with wallet balance fetched"
    )
  );
});

export const getDoctorWalletTransactions = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const {
    page = 1,
    limit = 10,
    fromDate,
    toDate,
    status,
  } = req.query;

  if (!doctorId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "doctorId is required"));
  }

  const filter = {
    doctorId,
    type: "credit",
    status:"available", // only earning transactions
  };

  if (status) filter.status = status;

  // 🟢 Date filter
  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  const totalCount = await DoctorNewWallet.countDocuments(filter);

  const transactions = await DoctorNewWallet.find(filter)
    //.populate("appointmentId", "appointmentId date fee serviceType")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page: pageNumber,
        limit: pageLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
        transactions,
      },
      "Doctor wallet transactions fetched successfully"
    )
  );
});

export const markPayoutAsPaid = asyncHandler(async (req, res) => {
  const { payoutId } = req.params;
  const { transactionRef } = req.body;

  const payout = await DoctorPayout.findById(payoutId);

  if (!payout) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Payout not found"));
  }

  if (payout.status === "paid") {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Payout already marked as paid"));
  }

  // 1️⃣ Create wallet debit entry
  await DoctorNewWallet.create({
    doctorId: payout.doctorId,
    amount: payout.payableAmount,
    type: "debit",
    source: "payout",
    status: "paid",
    note: `Payout from ${payout.fromDate.toDateString()} to ${payout.toDate.toDateString()}`,
  });

  // 2️⃣ Update payout
  payout.status = "paid";
  payout.paidAt = new Date();
  payout.transactionRef = transactionRef || "";

  await payout.save();

  return res
    .status(200)
    .json(new apiResponse(200, payout, "Payout marked as paid successfully"));
});

export const markDoctorPayoutsAsPaidBulk = asyncHandler(async (req, res) => {
  const { payoutIds = [], transactionRef } = req.body;

  if (!payoutIds.length) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "payoutIds array is required"));
  }

  const updatedPayouts = [];
  const skipped = [];

  for (const payoutId of payoutIds) {
    const payout = await DoctorPayout.findById(payoutId);

    if (!payout) {
      skipped.push({ payoutId, reason: "Not found" });
      continue;
    }

    if (payout.status === "paid") {
      skipped.push({ payoutId, reason: "Already paid" });
      continue;
    }

    // Create debit wallet entry
    await DoctorNewWallet.create({
      doctorId: payout.doctorId,
      amount: payout.payableAmount,
      type: "debit",
      source: "payout",
      status: "paid",
      note: `Bulk payout from ${payout.fromDate.toDateString()} to ${payout.toDate.toDateString()}`,
    });

    payout.status = "paid";
    payout.paidAt = new Date();
    payout.transactionRef = transactionRef || "";

    await payout.save();

    updatedPayouts.push(payout);
  }

  return res.status(200).json(
    new apiResponse(
      200,
      {
        updatedCount: updatedPayouts.length,
        skippedCount: skipped.length,
        skipped,
        payouts: updatedPayouts,
      },
      "Bulk doctor payout processed"
    )
  );
});

// Diagnostic payout controllers - generate payout, list payouts, mark as paid

export const generateDiagnosticPayout = asyncHandler(async (req, res) => {
  const { diagnosticIds = [], fromDate, toDate } = req.body;

  const diagnostics =
    diagnosticIds.length > 0
      ? await Diagnostic.find({ _id: { $in: diagnosticIds } })
      : await Diagnostic.find({ isActive: true });

  const payouts = [];

  for (const diagnostic of diagnostics) {
    const walletEntries = await DiagnosticNewWallet.find({
      diagnosticId: diagnostic._id,
      type: "credit",
      status: "available",
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    });

    if (!walletEntries.length) continue;

    const payableAmount = walletEntries.reduce(
      ((sum, w) => sum + w.amount,
      0).toFixed(2)
    );

    const payout = await DiagnosticPayout.create({
      diagnosticId: diagnostic._id,
      fromDate,
      toDate,
      totalAppointments: walletEntries.length,
      payableAmount,
      status: "pending",
    });

    await DiagnosticNewWallet.updateMany(
      { _id: { $in: walletEntries.map(w => w._id) } },
      { status: "paid" }
    );

    payouts.push(payout);
  }

  return res.status(200).json(
    new apiResponse(
      200,
      payouts,
      `Diagnostic payout generated for ${payouts.length} center(s)`
    )
  );
});

export const getDiagnosticPayoutList = asyncHandler(async (req, res) => {
  const {
    diagnosticId,
    status,
    fromDate,
    toDate,
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};

  if (diagnosticId) filter.diagnosticId = diagnosticId;
  if (status) filter.status = status;

  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  // Get total count
  const totalCount = await DiagnosticPayout.countDocuments(filter);

  // Fetch paginated data
  const payouts = await DiagnosticPayout.find(filter)
    .populate("diagnosticId", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page: pageNumber,
        limit: pageLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
        payouts,
      },
      "Diagnostic payout list fetched"
    )
  );
});

export const markDiagnosticPayoutAsPaid = asyncHandler(async (req, res) => {
  const { payoutId } = req.params;
  const { transactionRef } = req.body;

  const payout = await DiagnosticPayout.findById(payoutId);

  if (!payout) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Payout not found"));
  }

  if (payout.status === "paid") {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Already paid"));
  }

  await DiagnosticNewWallet.create({
    diagnosticId: payout.diagnosticId,
    amount: payout.payableAmount,
    type: "debit",
    source: "payout",
    status: "paid",
    note: `Payout for ${payout.fromDate.toDateString()} - ${payout.toDate.toDateString()}`,
  });

  payout.status = "paid";
  payout.paidAt = new Date();
  payout.transactionRef = transactionRef || "";

  await payout.save();

  return res
    .status(200)
    .json(new apiResponse(200, payout, "Diagnostic payout marked as paid"));
});

export const getDiagnosticsWithBalance = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const skip = (page - 1) * limit;

  const result = await DiagnosticNewWallet.aggregate([
    {
      $match: {
        type: "credit",
        status: "available",
      },
    },
    {
      $group: {
        _id: "$diagnosticId",
        totalBalance: { $sum: "$amount" },
        totalEntries: { $sum: 1 },
      },
    },
    {
      $match: {
        totalBalance: { $gt: 0 },
      },
    },
    {
      $sort: { totalBalance: -1 }, // highest balance first
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const totalCount = result[0]?.metadata[0]?.total || 0;
  const paginatedData = result[0]?.data || [];

  const diagnosticIds = paginatedData.map(w => w._id);

  const diagnostics = await Diagnostic.find({ _id: { $in: diagnosticIds } })
    .select("name email phone");

  const response = diagnostics.map(diag => {
    const wallet = paginatedData.find(
      w => w._id.toString() === diag._id.toString()
    );

    return {
      diagnosticId: diag._id,
      fullName: diag.name,
      email: diag.email,
      phone: diag.phone,
      totalBalance: wallet?.totalBalance || 0,
      totalAppointments: wallet?.totalEntries || 0,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        response,
      },
      "Diagnostics with wallet balance fetched"
    )
  );
});

export const getDiagnosticsWithBalanceFilter = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;

  const skip = (page - 1) * limit;

  // 🟢 Build dynamic date filter
  let dateFilter = {};

  if (fromDate || toDate) {
    dateFilter.createdAt = {};

    if (fromDate) {
      dateFilter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999); // include full day
      dateFilter.createdAt.$lte = endDate;
    }
  }

  const result = await DiagnosticNewWallet.aggregate([
    {
      $match: {
        type: "credit",
        status: "available",
        ...dateFilter, // 👈 date filter added here
      },
    },
    {
      $group: {
        _id: "$diagnosticId",
        totalBalance: { $sum: "$amount" },
        totalEntries: { $sum: 1 },
      },
    },
    {
      $match: {
        totalBalance: { $gt: 0 },
      },
    },
    {
      $sort: { totalBalance: -1 },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const totalCount = result[0]?.metadata[0]?.total || 0;
  const paginatedData = result[0]?.data || [];

  const diagnosticIds = paginatedData.map(w => w._id);

  const diagnostics = await Diagnostic.find({ _id: { $in: diagnosticIds } })
    .select("name email phone");

  const response = diagnostics.map(diag => {
    const wallet = paginatedData.find(
      w => w._id.toString() === diag._id.toString()
    );

    return {
      diagnosticId: diag._id,
      fullName: diag.name,
      email: diag.email,
      phone: diag.phone,
      totalBalance: wallet?.totalBalance || 0,
      totalAppointments: wallet?.totalEntries || 0,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        fromDate: fromDate || null,
        toDate: toDate || null,
        response,
      },
      "Diagnostics with wallet balance fetched"
    )
  );
});

export const getDiagnosticWalletTransactions = asyncHandler(async (req, res) => {
  const { diagnosticId } = req.params;
  const {
    page = 1,
    limit = 10,
    fromDate,
    toDate,
    status,
  } = req.query;

  if (!diagnosticId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "diagnosticId is required"));
  }

  const filter = {
    diagnosticId,
    type: "credit",
    status: "available",
  };

  if (status) filter.status = status;

  // 🟢 Date filter
  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  const totalCount = await DiagnosticNewWallet.countDocuments(filter);

  const transactions = await DiagnosticNewWallet.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page: pageNumber,
        limit: pageLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
        transactions,
      },
      "Diagnostic wallet transactions fetched successfully"
    )
  );
});

export const markDiagnosticPayoutsAsPaidBulk = asyncHandler(async (req, res) => {
  const { payoutIds = [], transactionRef } = req.body;

  if (!payoutIds.length) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "payoutIds array is required"));
  }

  const updatedPayouts = [];
  const skipped = [];

  for (const payoutId of payoutIds) {
    const payout = await DiagnosticPayout.findById(payoutId);

    if (!payout) {
      skipped.push({ payoutId, reason: "Not found" });
      continue;
    }

    if (payout.status === "paid") {
      skipped.push({ payoutId, reason: "Already paid" });
      continue;
    }

    // Create debit wallet entry
    await DiagnosticNewWallet.create({
      diagnosticId: payout.diagnosticId,
      amount: payout.payableAmount,
      type: "debit",
      source: "payout",
      status: "paid",
      note: `Bulk payout from ${payout.fromDate.toDateString()} to ${payout.toDate.toDateString()}`,
    });

    payout.status = "paid";
    payout.paidAt = new Date();
    payout.transactionRef = transactionRef || "";

    await payout.save();

    updatedPayouts.push(payout);
  }

  return res.status(200).json(
    new apiResponse(
      200,
      {
        updatedCount: updatedPayouts.length,
        skippedCount: skipped.length,
        skipped,
        payouts: updatedPayouts,
      },
      "Bulk diagnostic payout processed"
    )
  );
});

// Hospital payout controllers - generate payout, list payouts, mark as paid

export const getHospitalsWithBalance = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const skip = (page - 1) * limit;

  const result = await HospitalNewWallet.aggregate([
    {
      $match: {
        type: "credit",
        status: "available",
      },
    },
    {
      $group: {
        _id: "$hospitalId",
        totalBalance: { $sum: "$amount" },
        totalEntries: { $sum: 1 },
      },
    },
    {
      $match: {
        totalBalance: { $gt: 0 },
      },
    },
    {
      $sort: { totalBalance: -1 }, // highest balance first
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const totalCount = result[0]?.metadata[0]?.total || 0;
  const paginatedData = result[0]?.data || [];

  const hospitalIds = paginatedData.map(w => w._id);

  const hospitals = await Hospital.find({ _id: { $in: hospitalIds } })
    .select("name email phone");

  const response = hospitals.map(hosp => {
    const wallet = paginatedData.find(
      w => w._id.toString() === hosp._id.toString()
    );

    return {
      hospitalId: hosp._id,
      name: hosp.name,
      email: hosp.email,
      phone: hosp.phone,
      totalBalance: wallet?.totalBalance || 0,
      totalAppointments: wallet?.totalEntries || 0,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        response,
      },
      "Hospitals with wallet balance fetched"
    )
  );
});

export const getHospitalsWithBalanceFilter = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const fromDate = req.query.fromDate;
  const toDate = req.query.toDate;

  const skip = (page - 1) * limit;

  // 🟢 Build dynamic date filter
  let dateFilter = {};

  if (fromDate || toDate) {
    dateFilter.createdAt = {};

    if (fromDate) {
      dateFilter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999); // include full day
      dateFilter.createdAt.$lte = endDate;
    }
  }

  const result = await HospitalNewWallet.aggregate([
    {
      $match: {
        type: "credit",
        status: "available",
        ...dateFilter, // 👈 date filter added here
      },
    },
    {
      $group: {
        _id: "$hospitalId",
        totalBalance: { $sum: "$amount" },
        totalEntries: { $sum: 1 },
      },
    },
    {
      $match: {
        totalBalance: { $gt: 0 },
      },
    },
    {
      $sort: { totalBalance: -1 },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const totalCount = result[0]?.metadata[0]?.total || 0;
  const paginatedData = result[0]?.data || [];

  const hospitalIds = paginatedData.map(w => w._id);

  const hospitals = await Hospital.find({ _id: { $in: hospitalIds } })
    .select("name email phone");

  const response = hospitals.map(hosp => {
    const wallet = paginatedData.find(
      w => w._id.toString() === hosp._id.toString()
    );

    return {
      hospitalId: hosp._id,
      name: hosp.name,
      email: hosp.email,
      phone: hosp.phone,
      totalBalance: wallet?.totalBalance || 0,
      totalAppointments: wallet?.totalEntries || 0,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        fromDate: fromDate || null,
        toDate: toDate || null,
        response,
      },
      "Hospitals with wallet balance fetched"
    )
  );
});

export const getHospitalWalletTransactions = asyncHandler(async (req, res) => {
  const { hospitalId } = req.params;
  const {
    page = 1,
    limit = 10,
    fromDate,
    toDate,
    status,
  } = req.query;

  if (!hospitalId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "hospitalId is required"));
  }

  const filter = {
    hospitalId,
    type: "credit",
    status: "available",
  };

  if (status) filter.status = status;

  // 🟢 Date filter
  if (fromDate || toDate) {
    filter.createdAt = {};

    if (fromDate) {
      filter.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  const totalCount = await HospitalNewWallet.countDocuments(filter);

  const transactions = await HospitalNewWallet.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page: pageNumber,
        limit: pageLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
        transactions,
      },
      "Hospital wallet transactions fetched successfully"
    )
  );
});

export const generateHospitalPayout = asyncHandler(async (req, res) => {
  const { hospitalIds = [], fromDate, toDate } = req.body;

  if (!fromDate || !toDate) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "fromDate and toDate are required"));
  }

  const hospitals =
  hospitalIds.length > 0
    ? await Hospital.find({ _id: { $in: hospitalIds } })
    : await Hospital.find({});

  const payouts = [];

  for (const hospital of hospitals) {
    const walletEntries = await HospitalNewWallet.find({
      hospitalId: hospital._id,
      type: "credit",
      status: "available",
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    });

    if (!walletEntries.length) continue;

    const payableAmount = walletEntries.reduce(
      ((sum, w) => sum + w.amount,
      0).toFixed(2)
    );

    const payout = await HospitalPayout.create({
      hospitalId: hospital._id,
      fromDate,
      toDate,
      totalAppointments: walletEntries.length,
      grossAmount: payableAmount,
      payableAmount,
      status: "pending",
    });

    await HospitalNewWallet.updateMany(
      { _id: { $in: walletEntries.map(w => w._id) } },
      { status: "paid" }
    );

    payouts.push(payout);
  }

  return res.status(200).json(
    new apiResponse(
      200,
      payouts,
      `Hospital payout generated for ${payouts.length} hospital(s)`
    )
  );
});

export const getHospitalPayoutList = asyncHandler(async (req, res) => {
  const {
    hospitalId,
    status,
    fromDate,
    toDate,
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};

  if (hospitalId) filter.hospitalId = hospitalId;
  if (status) filter.status = status;

  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  // Get total count
  const totalCount = await HospitalPayout.countDocuments(filter);

  // Fetch paginated results
  const payouts = await HospitalPayout.find(filter)
    .populate("hospitalId", "name email phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageLimit);

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page: pageNumber,
        limit: pageLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
        payouts,
      },
      "Hospital payout list fetched"
    )
  );
});

export const markHospitalPayoutAsPaid = asyncHandler(async (req, res) => {
  const { payoutId } = req.params;
  const { transactionRef } = req.body;

  const payout = await HospitalPayout.findById(payoutId);

  if (!payout) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Payout not found"));
  }

  if (payout.status === "paid") {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Already paid"));
  }

  await HospitalNewWallet.create({
    hospitalId: payout.hospitalId,
    amount: payout.payableAmount,
    type: "debit",
    source: "payout",
    status: "paid",
    note: `Payout from ${payout.fromDate.toDateString()} to ${payout.toDate.toDateString()}`,
  });

  payout.status = "paid";
  payout.paidAt = new Date();
  payout.transactionRef = transactionRef || "";

  await payout.save();

  return res
    .status(200)
    .json(new apiResponse(200, payout, "Hospital payout marked as paid"));
});

export const markHospitalPayoutsAsPaidBulk = asyncHandler(async (req, res) => {
  const { payoutIds = [], transactionRef } = req.body;

  if (!payoutIds.length) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "payoutIds array is required"));
  }

  const updatedPayouts = [];
  const skipped = [];

  for (const payoutId of payoutIds) {
    const payout = await HospitalPayout.findById(payoutId);

    if (!payout) {
      skipped.push({ payoutId, reason: "Not found" });
      continue;
    }

    if (payout.status === "paid") {
      skipped.push({ payoutId, reason: "Already paid" });
      continue;
    }

    // Create debit wallet entry
    await HospitalNewWallet.create({
      hospitalId: payout.hospitalId,
      amount: payout.payableAmount,
      type: "debit",
      source: "payout",
      status: "paid",
      note: `Bulk payout from ${payout.fromDate.toDateString()} to ${payout.toDate.toDateString()}`,
    });

    payout.status = "paid";
    payout.paidAt = new Date();
    payout.transactionRef = transactionRef || "";

    await payout.save();

    updatedPayouts.push(payout);
  }

  return res.status(200).json(
    new apiResponse(200, {
      updatedCount: updatedPayouts.length,
      skippedCount: skipped.length,
      skipped,
      payouts: updatedPayouts,
    }, "Bulk hospital payout processed")
  );
});

// Platform Earnings api

export const getPlatformEarnings = asyncHandler(async (req, res) => {
  const {
    doctorId,
    diagnosticId,
    hospitalId,
    status,
    fromDate,
    toDate,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = {};

  // 🔹 Provider Filters
  if (doctorId) filter.doctorId = doctorId;
  if (diagnosticId) filter.diagnosticId = diagnosticId;
  if (hospitalId) filter.hospitalId = hospitalId;

  if (status) filter.status = status;

  // 🔹 Date Filter
  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const totalCount = await PlatformEarning.countDocuments(filter);

  const earnings = await PlatformEarning.find(filter)
    .populate("doctorId", "fullName email phone")
    .populate("diagnosticId", "name email phone")
    .populate("hospitalId", "name email phone")
    .sort({ [sortBy]: sortDirection })
    .skip(skip)
    .limit(pageLimit);

  // 🔥 Normalize provider type for frontend
  const formatted = earnings.map(item => {
    let providerType = "";
    let provider = null;

    if (item.doctorId) {
      providerType = "Doctor";
      provider = item.doctorId;
    } else if (item.diagnosticId) {
      providerType = "Diagnostic";
      provider = item.diagnosticId;
    } else if (item.hospitalId) {
      providerType = "Hospital";
      provider = item.hospitalId;
    }

    return {
      _id: item._id,
      appointmentId: item.appointmentId,
      providerType,
      provider,
      totalAmount: item.totalAmount,
      platformFee: item.platformFee,
      providerAmount:
        item.doctorAmount ||
        item.diagnosticAmount ||
        item.hospitalAmount ||
        0,
      status: item.status,
      createdAt: item.createdAt,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        page: pageNumber,
        limit: pageLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / pageLimit),
        formatted,
      },
      "Platform earnings fetched successfully"
    )
  );
});