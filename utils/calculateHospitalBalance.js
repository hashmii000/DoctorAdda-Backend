import mongoose from "mongoose";
import HospitalNewWallet from "../models/HospitalNewWallet.modal.js";

export const calculateHospitalBalance = async (hospitalId) => {
  const result = await HospitalNewWallet.aggregate([
    {
      $match: {
        hospitalId: new mongoose.Types.ObjectId(hospitalId),
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let totalCredit = 0;
  let totalDebit = 0;

  result.forEach(r => {
    if (r._id === "credit") totalCredit = r.total;
    if (r._id === "debit") totalDebit = r.total;
  });

  return {
    totalCredit,
    totalDebit,
    balance: totalCredit - totalDebit,
  };
};