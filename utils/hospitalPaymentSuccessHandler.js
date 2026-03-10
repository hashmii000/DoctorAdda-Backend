
import Hospital from "../models/Hospital.modal.js";
import User from "../models/User.modal.js";
import HospitalWallet from "../models/HospitalWalletHistory.modal.js";
import HospitalNewWallet from "../models/HospitalNewWallet.modal.js";
import PlatformEarning from "../models/PlatformEarning.modal.js";


export const handleHospitalSuccessfulPayment = async ({
  appointment,
  transactionId,
  paymentGateway,
}) => {
  const existingHospital = await Hospital.findById(appointment.hospital);
  const patient = await User.findById(appointment.patientId);

  if (!existingHospital) {
    throw new Error("Hospital not found");
  }

  const walletPercentage = existingHospital.walletPercentage || 10;

  const platformFee = (appointment.fee * walletPercentage) / 100;
  const hospitalAmount = appointment.fee - platformFee;

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
    totalAmount: appointment.fee,
    platformFee,
    hospitalAmount,
    walletPercentage,
  };

  // ✅ Credit Hospital wallet
  existingHospital.wallet += hospitalAmount;

  // Ledger entry (new wallet table)
  await HospitalNewWallet.create({
    hospitalId: existingHospital._id,
    appointmentId: appointment._id,
    amount: hospitalAmount,
    type: "credit",
    source: "appointment",
    note: `Hospital consultation credited via ${paymentGateway}`,
  });

  // Platform earning entry
  await PlatformEarning.create({
    appointmentId: appointment._id,
    hospitalId: existingHospital._id,
    totalAmount: appointment.fee,
    platformFee,
    hospitalAmount,
    providerType: "Hospital",
    paymentGateway,
  });

  // Optional legacy wallet entry old 
  await HospitalWallet.create({
    HospitalId: existingHospital._id,
    patientId: patient._id,
    consultationId: appointment._id,
    amount: hospitalAmount,
    paymentType: "credited",
   // note: `Hospital fee credited via ${paymentGateway}`,
   note: `Hospital service fee credited on ${new Date().toLocaleDateString()}`,
  });

  await existingHospital.save();
  await appointment.save();
};