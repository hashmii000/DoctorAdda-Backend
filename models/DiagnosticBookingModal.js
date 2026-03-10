import mongoose from "mongoose";

const DiagnosticAppointmentSchema = new mongoose.Schema(
  {
    referalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorReferal",
    },
    referBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    diagnostic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
      required: true,
    },
    otherPatientDetails: {
      name: { type: String },
      age: { type: String },
      gender: { type: String },
      number: { type: String },
      weight: { type: String },
    },
    service: [
      {
        name: {
          type: String,
        },
        price: {
          type: String,
        },
        _id: {
          type: String,
        },
      },
    ],
    packages: [
      {
        name: {
          type: String,
        },
        price: {
          type: String,
        },
        details: {
          type: String,
        },
        _id: {
          type: String,
        },
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled"],
      default: "Pending",
    },
    amount: {
      type: Number,
    },
    report: {
      type: String,
    },
     date: {
      type: String,
      required: true,
    },
    slots: {
      startTime: String,
      endTime: String,
    },
    userDelete: {
      type: Boolean,
      default: false,
    },
    diagnosticDelete: {
      type: Boolean,
      default: false,
    },
    
    userAddress: {
      type: String,
    },
    appointmentId: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

const DiagnosticAppointment = mongoose.model(
  "DiagnosticAppointment",
  DiagnosticAppointmentSchema
);

export default DiagnosticAppointment;
