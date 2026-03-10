import mongoose from "mongoose";
import DoctorNewWallet from "../models/DoctorWallet.modal.js";
export const calculateDoctorBalance = async (doctorId) => {
  const result = await DoctorNewWallet.aggregate([
    {
      $match: { doctorId: new mongoose.Types.ObjectId(doctorId) },
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