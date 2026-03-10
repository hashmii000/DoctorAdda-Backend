import Diagnostic from "../models/Diagnostic.modal.js";
import User from "../models/User.modal.js";
import DiagnosticWallet from "../models/diagnosticWalletHistory.modal.js";
import DiagnosticNewWallet from "../models/DiagnosticWallet.modal.js";
import PlatformEarning from "../models/PlatformEarning.modal.js";

export const handleDiagnosticSuccessfulPayment = async ({
  appointment,
  transactionId,
  paymentGateway,
}) => {
  const existingDiagnostic = await Diagnostic.findById(
    appointment.diagnostic
  );

  const patient = await User.findById(appointment.patient);

  if (!existingDiagnostic) {
    throw new Error("Diagnostic center not found");
  }

  // Percentage (like doctor.walletPercentage)
  const walletPercentage = existingDiagnostic.walletPercentage || 10;

  const platformFee = (appointment.amount * walletPercentage) / 100;
  const diagnosticAmount = appointment.amount - platformFee;

  // ✅ Update appointment
  appointment.status = "Confirmed";
  appointment.paymentStatus = "Completed";

  appointment.paymentDetails = {
    ...appointment.paymentDetails,
    transactionId,
    paymentDate: new Date(),
    gateway: paymentGateway,
  };

  appointment.paymentSummary = {
    totalAmount: appointment.amount,
    platformFee,
    diagnosticAmount,
    walletPercentage,
  };

  //  Credit Diagnostic Wallet
  existingDiagnostic.wallet += diagnosticAmount;

  await DiagnosticNewWallet.create({
    diagnosticId: existingDiagnostic._id,
    appointmentId: appointment._id,
    amount: diagnosticAmount,
    type: "credit",
    source: "appointment",
    note: `Diagnostic booking credited via ${paymentGateway}`,
  });

  // Platform earning entry
  await PlatformEarning.create({
    diagnosticId: existingDiagnostic._id,
    appointmentId: appointment._id,
    totalAmount: appointment.amount,
    platformFee,
    diagnosticAmount,
    providerType: "Diagnostic",
    paymentGateway,
  });

  //  Old wallet table (if using)
  await DiagnosticWallet.create({
    DiagnosticId: existingDiagnostic._id,
    patientId: patient._id,
    consultationId: appointment._id,
    amount: diagnosticAmount,
    paymentType: "credited",
   // note: `Diagnostic fee credited via ${paymentGateway}`,
   note: `Diagnostic service fee credited  on ${new Date().toLocaleDateString()}`,
  });

  await existingDiagnostic.save();
  await appointment.save();
};