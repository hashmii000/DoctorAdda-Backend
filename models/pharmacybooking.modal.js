import mongoose from "mongoose";

const PharmacyAppointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },
    otherPatientDetails: {
      name: { type: String },
      age: { type: String },
      gender: { type: String },
      number: { type: String },
      weight: { type: String },
    },
    medicine: [
      {
        medicineName: {
          type: String,
        },
        discription: {
          type: String,
        },
        amount: {
          type: String,
        },
        qyt: {
          type: String,
        },
      },
    ],

    deliveryMode: {
      type: String,
      enum: ["home", "pickup"],
      // required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Confirmed",
        "Packed",
        "In Transit",
        "Delivered",
        ,
        "Rejected",
      ],
      default: "Pending",
    },
    amount: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    discountAmount: {
      type: Number,
    },
    PaybleAmount: {
      type: Number,
    },
    report: {
      type: String,
    },
    discription: {
      type: String,
    },

    userDelete: {
      type: Boolean,
      default: false,
    },
    onlinePayment: {
      type: Boolean,
      default: true,
    },
    cod: {
      type: Boolean,
      default: true,
    },
    PharmacyDelete: {
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

const PharmacyAppointment = mongoose.model(
  "PharmacyAppointment",
  PharmacyAppointmentSchema
);

export default PharmacyAppointment;
