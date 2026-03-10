import ContactUs from "../models/Contact.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create a new ContactUs entry
const createContactUs = asyncHandler(async (req, res) => {
  const { name, subject, email, message } = req.body;

  if (!name || !subject) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Name and subject are required."));
  }

  try {
    const contact = new ContactUs({ name, subject, email, message });
    const savedContact = await contact.save();
    res
      .status(201)
      .json(new apiResponse(201, savedContact, "Contact message submitted successfully."));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get all ContactUs entries with optional pagination and search
const getAllContacts = asyncHandler(async (req, res) => {
  try {
    const { isPagination = 'true', page = 1, limit = 10, search } = req.query;

    const searchQuery = {};

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    if (isPagination === 'true') {
      const skip = (page - 1) * limit;
      const totalContacts = await ContactUs.countDocuments(searchQuery);
      const contacts = await ContactUs.find(searchQuery)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      res.status(200).json(new apiResponse(200, {
        contacts,
        totalContacts,
        totalPages: Math.ceil(totalContacts / limit),
        currentPage: Number(page),
      }, "Contacts fetched successfully"));
    } else {
      const contacts = await ContactUs.find(searchQuery).sort({ createdAt: -1 });
      res.status(200).json(new apiResponse(200, contacts, "Contacts fetched successfully"));
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Get a ContactUs entry by ID
const getContactById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const contact = await ContactUs.findById(id);
    if (!contact) {
      return res.status(404).json(new apiResponse(404, null, "Contact not found"));
    }
    res.status(200).json(new apiResponse(200, contact, "Contact fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update a ContactUs entry by ID
const updateContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const contact = await ContactUs.findById(id);
    if (!contact) {
      return res.status(404).json(new apiResponse(404, null, "Contact not found"));
    }

    Object.keys(updateData).forEach((key) => {
      contact[key] = updateData[key];
    });

    const updatedContact = await contact.save();
    res.status(200).json(new apiResponse(200, updatedContact, "Contact updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete a ContactUs entry by ID
const deleteContact = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const contact = await ContactUs.findByIdAndDelete(id);
    if (!contact) {
      return res.status(404).json(new apiResponse(404, null, "Contact not found"));
    }
    res.status(200).json(new apiResponse(200, null, "Contact deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createContactUs,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact
};
