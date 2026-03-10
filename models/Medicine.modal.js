import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    price: {
      type: String,
    },
    company: {
      type: String,
    },
    packSize: {
      type: String,
    },
    sortName: {
      type: String,
    },
    generic_name: {
      type: String,
    },
    brand_names: {
      type: String,
    },
    manufacturer: {
      type: String,
    },
    medical_system: {
      type: String,
    },
    primary_specialty: {
      type: String,
    },
    secondary_specialties: {
      type: String,
    },
    patient_conditions: {
      type: String,
    },
    sub_category: {
      type: String,
    },
    formulation: {
      type: String,
    },
    strength: {
      type: String,
    },
    pack_size: {
      type: String,
    },
    prescription_required: {
      type: String,
    },
    indications_symptoms: {
      type: String,
    },
    benefits_summary: {
      type: String,
    },
    common_side_effects: {
      type: String,
    },
    contraindications: {
      type: String,
    },
    storage_conditions: {
      type: String,
    },
    vet_safe: {
      type: String,
    },
    keywords_synonyms: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Medicine = mongoose.model("Medicine", MedicineSchema);

export default Medicine;
