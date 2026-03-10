import mongoose from "mongoose";

const HealthCardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,  
  },

 
},
  {
    timestamps: true,
  }
);

const HealthCard = mongoose.model("HealthCard", HealthCardSchema);

export default HealthCard;


