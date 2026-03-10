import Doctor from "../models/Doctor.modal.js";
import User from "../models/User.modal.js";
import DoctorWallet from "../models/DoctorWalletHistory.modal.js";
import DoctorsNewWallet from "../models/DoctorWallet.modal.js";
import PlatformEarning from "../models/PlatformEarning.modal.js";
export const handleSuccessfulPayment = async ({
  appointment,
  serviceType,
  transactionId,
  paymentGateway,
}) => {
  const existingDoctor = await Doctor.findById(appointment.doctor);
  const patient = await User.findById(appointment.patient);

  const walletPercentage = existingDoctor.walletPercentage || 10;

  const platformFee = (appointment.fee * walletPercentage) / 100;
  const doctorAmount = appointment.fee - platformFee;

  // Update appointment
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
    doctorAmount,
    walletPercentage,
  };

  // Credit doctor wallet
  existingDoctor.wallet += doctorAmount;

  await DoctorsNewWallet.create({
    doctorId: existingDoctor._id,
    appointmentId: appointment._id,
    amount: doctorAmount,
    type: "credit",
    source: "appointment",
    note: `Credited via ${paymentGateway}`,
  });

  await PlatformEarning.create({
    appointmentId: appointment._id,
    doctorId: existingDoctor._id,
    totalAmount: appointment.fee,
    platformFee,
    doctorAmount,
    providerType: "Doctor",
    paymentGateway,
  });

  await DoctorWallet.create({
    doctorId: existingDoctor._id,
    patientId: patient._id,
    consultationId: appointment._id,
    amount: doctorAmount,
    paymentType: "credited",
    note: `Consultation fee credited for ${serviceType} on ${new Date().toLocaleDateString()}`,
   // note: `Consultation fee credited via ${paymentGateway}`,
  });

  await existingDoctor.save();
  await appointment.save();
};