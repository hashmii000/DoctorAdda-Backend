import mongoose from "mongoose";
import DiagnosticNewWallet from "../models/DiagnosticWallet.modal.js";
export const calculateDiagnosticBalance = async (diagnosticId) => {
  const result = await DiagnosticNewWallet.aggregate([
    {
      $match: {
        diagnosticId: new mongoose.Types.ObjectId(diagnosticId),
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