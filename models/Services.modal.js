import mongoose from "mongoose";

const ServicesSchema = new mongoose.Schema({
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

const Services = mongoose.model("Services", ServicesSchema);

export default Services;


