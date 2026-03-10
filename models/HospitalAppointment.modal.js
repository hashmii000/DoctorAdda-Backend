// models/HospitalAppointment.model.js
import mongoose from "mongoose";

const HospitalAppointmentSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    doctorType: {
      type: String,
      enum: ["Internal", "Registered"],
      required: true,
    },
    userDelete: {
      type: Boolean,
      default: false,
    },
    doctorsDetails: {
      name: { type: String },
      specialization: { type: String },
      exp: { type: String },
    },
    hospitalDelete: {
      type: Boolean,
      default: false,
    },
    internalDoctorId: {
      type: String,
    },
    registeredDoctorId: {
      type: String,
    },

    prescriptions: [
      {
        uploadBy: {
          type: String,
          enum: ["Hospital", "User"],
          default: "Hospital",
        },
        url: {
          type: String,
        },
      },
    ],

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isSelf: {
      type: Boolean,
      default: true,
    },
    otherPatientDetails: {
      type: new mongoose.Schema(
        {
          name: { type: String },
          age: { type: String },
          gender: { type: String },
          type: { type: String },
        },
        { _id: false }
      ),
      required: false,
    },
    date: {
      type: String,
      required: true,
    },
    slots: {
      startTime: String,
      endTime: String,
    },
    fee: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      // enum: ["Pending", "Completed", "Refunded"],
      default: "Pending",
    },
    paymentDetails: {
      amount: Number,
      transactionId: String,
      paymentMethod: String,
      orderId: String,
      currency: String,
      paymentDate: Date,
    },
    appointmentId: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("HospitalAppointment", HospitalAppointmentSchema);
