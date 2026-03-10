import mongoose from "mongoose";

const FacilitieSchema = new mongoose.Schema({
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

const Facilitie = mongoose.model("Facilitie", FacilitieSchema);

export default Facilitie;


