import mongoose from 'mongoose';

const AmbulanceBookingSchema = new mongoose.Schema(
  {
    ambulance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambulance',  
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
    },
    otherPatientDetails:{
      name:String,
      age:String,
      gender:String,
      report:String
    },
    otherDetails:{
        pickUpLocation:String,
        dropLocation:String,
    },
    date: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Pending'
    },
    AmbulanceBookingId:{
      type:String,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Refunded'],
      default: 'Pending'
    },
    paymentDetails: {
      amount: Number,
      transactionId: String,
      paymentMethod: String,
      orderId:String,
      currency:String,
      paymentDate: Date
    },
  
  },
  {
    timestamps: true,
  }
);


const AmbulanceBooking = mongoose.model('AmbulanceBooking', AmbulanceBookingSchema);

export default AmbulanceBooking;
