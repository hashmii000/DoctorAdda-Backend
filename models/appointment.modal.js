import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    diagnostic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otherPatientDetails: {
      type: new mongoose.Schema(
        {
          name: { type: String },
          petAge: {
            type: mongoose.Schema.Types.Mixed,
            validate: {
              validator: function (value) {
                return (
                  typeof value === "string" ||
                  (typeof value === "object" && value !== null)
                );
              },
              message: "petAge must be either a string or an object",
            },
          },
          age: {
            type: mongoose.Schema.Types.Mixed,
            validate: {
              validator: function (value) {
                return (
                  typeof value === "string" ||
                  (typeof value === "object" && value !== null)
                );
              },
              message: "Age must be either a string or an object",
            },
          },
          gender: { type: String },
          type: { type: String },
        },
        { _id: false }
      ),
      required: false,
    },
    isSelf: {
      type: String,
      default: true,
      required: true,
    },
    userDelete: {
      type: Boolean,
      default: false,
    },
    doctorDelete: {
      type: Boolean,
      default: false,
    },
    clinicName: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    fee: {
      type: String,
    },

    vaccineInfo: {
      vaccine: {
        type: String,
      },
      nextVaccineDate: {
        type: Date,
      },
      duration: {
        type: String,
      },
      status: {
        type: String,
      },
    },
    slots: {
      startTime: String,
      endTime: String,
    },
    serviceType: {
      type: String,
      enum: ["In-clinic", "Video Consultation"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled"],
      default: "Pending",
    },
    appointmentId: {
      type: String,
    },
    doctorStatus: {
      type: String,
      enum: ["Preparing", "Ready", "In Session"],
      default: "Preparing",
    },
    paymentStatus: {
      type: String,
      // enum: ["Pending","Paid","Failed", "Completed","Aborted" "Refunded"],
      default: "Pending",
    },

    paymentGateway: {
      type: String,
      enum: ["Razorpay", "CCAvenue"],
    },
    prescriptions: [
      {
        uploadBy: {
          type: String,
          enum: ["Doctor", "User"],
          default: "Doctor",
        },
        url: {
          type: String,
        },
      },
    ],
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

const Appointment = mongoose.model("Appointment", AppointmentSchema);

export default Appointment;
