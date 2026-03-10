import BloodBank from "../models/BloodBank.modal.js";
import User from "../models/User.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { generateOTP } from "../utils/generateOTP.js";
import { calculateAverageRating } from '../utils/helper.js'

const OTP_EXPIRATION_TIME = 5 * 60 * 1000;

const registerBloodBanks = asyncHandler(async (req, res) => {
    const {
        name,
        phone,
        fcmToken,
        email,
        address,
        latitude,
        longitude,
        profilepic,
        hospital,
        description,
        accountType = "BloodBank"
    } = req.body;

    // Basic validations
    if (!name || !phone || !email || !latitude || !longitude || !address) {
        return res.status(400).json(new apiResponse(400, null, "Missing required fields."));
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json(new apiResponse(400, null, "Invalid coordinates."));
    }

    try {
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json(new apiResponse(400, null, "Phone number is already registered"));
        }

        const otp = generateOTP();
        const otpExpiration = new Date(Date.now() + OTP_EXPIRATION_TIME);

        const bloodBank = new BloodBank({
            name,
            phone,
            email,
            address,
            profilepic,
            hospital,
            fcmToken,
            description,
            location: {
                type: "Point",
                coordinates: [lng, lat],
            },
            accountType,
        });

        const savedBloodBank = await bloodBank.save();

        const newUser = new User({
            phone,
            otp,
            otpExpiration,
            accountType,
            accountId: savedBloodBank._id,
            isNew: false,
        });

        await newUser.save();

        res.status(201).json(new apiResponse(201, savedBloodBank, "BloodBank registered successfully"));
    } catch (error) {
        res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
    }
});

const registerBloodBank = asyncHandler(async (req, res) => {
    const {
        name,
        address,
        phone,
        fcmToken,
        latitude,
        longitude,
        email,
        accountType = "BloodBank",
        description,
    } = req.body;

    // Check for missing required fields
    if (!name || !latitude || !longitude || !description || !phone) {
        return res.status(400).json(new apiResponse(400, null, "Missing required fields."));
    }
    const existingUser = await User.findOne({ phone });




    try {

        if (existingUser) {
            if (existingUser.isNew) {
                const bloodBank = new BloodBank({
                    name,
                    location,
                    phone,
                    fcmToken,
                    description,
                    location: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    },
                    userId: existingUser?._id
                });

                const savedBloodBank = await bloodBank.save();

                existingUser.accountType = savedBloodBank?.accountType;
                existingUser.accountId = savedBloodBank._id;
                existingUser.isNew = false;
                await existingUser.save();

                res.status(201).json(new apiResponse(201, savedBloodBank, "BloodBank created successfully"));
            } else {
                return res.status(400).json(new apiResponse(400, null, "User already exists with this number"));
            }
        } else {
            return res.status(400).json(new apiResponse(400, null, "User not found."));
        }
    } catch (error) {
        res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
    }
});

const getAllBloodBanks = asyncHandler(async (req, res) => {
    try {
      const {
        isPagination = 'true',
        page = 1,
        limit = 10,
        search,
        latitude,
        longitude,
        radius = 5000,
        sortBy = 'rating',
      } = req.query;
  
      // Parse and validate inputs
      const parsedPage = Math.max(1, parseInt(page));
      const parsedLimit = Math.max(1, Math.min(100, parseInt(limit)));
      const parsedRadius = Math.max(1, parseInt(radius));
      const parsedSortBy = ['rating', 'recent'].includes(sortBy) ? sortBy : 'rating';
  
      const match = {};
  
      // Geolocation filter
      if (latitude && longitude) {
        const lng = parseFloat(longitude);
        const lat = parseFloat(latitude);
        const earthRadiusInKm = 6378.1;
        const radiusInRadians = parsedRadius / 1000 / earthRadiusInKm;
  
        match.location = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians],
          },
        };
      }
  
      // Build aggregation pipeline
      let pipeline = [{ $match: match }];
  
      // Keyword Search
      if (search) {
        const words = search
          .trim()
          .split(/\s+/)
          .map((word) => new RegExp(word, 'i'));
  
        const orConditions = words.flatMap((regex) => [
          { name: { $regex: regex } },
          { phone: { $regex: regex } },
          { email: { $regex: regex } },
          { address: { $regex: regex } },
          { description: { $regex: regex } },
        ]);
  
        pipeline.push({ $match: { $or: orConditions } });
      }
  
      // Sorting
      if (parsedSortBy === 'rating') {
        pipeline.push({ $sort: { averageRating: -1, createdAt: -1 } });
      } else if (parsedSortBy === 'recent') {
        pipeline.push({ $sort: { createdAt: -1 } });
      }
  
      // Count total matching records
      const totalBloodBanks = await BloodBank.aggregate([...pipeline, { $count: 'count' }]);
      const total = totalBloodBanks[0]?.count || 0;
  
      // Pagination
      if (isPagination === 'true') {
        pipeline.push(
          { $skip: (parsedPage - 1) * parsedLimit },
          { $limit: parsedLimit }
        );
      }
  
      const bloodBanks = await BloodBank.aggregate(pipeline);
  
      res.status(200).json(
        new apiResponse(
          200,
          {
            bloodBanks,
            totalBloodBanks: total,
            totalPages: Math.ceil(total / parsedLimit),
            currentPage: parsedPage,
          },
          "Blood banks fetched successfully"
        )
      );
    } catch (error) {
      console.error(error);
      res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
    }
  });
  

const getBloodBankById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const bloodBank = await BloodBank.findById(id).populate('hospital', 'name');
        if (!bloodBank) {
            return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
        }
        res.status(200).json(new apiResponse(200, bloodBank, "BloodBank fetched successfully"));
    } catch (error) {
        res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
    }
});

const updateBloodBank = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const bloodBank = await BloodBank.findById(id);
    if (!bloodBank) {
        return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }

    Object.assign(bloodBank, updateData);
    const updated = await bloodBank.save();

    res.status(200).json(new apiResponse(200, updated, "BloodBank updated"));
});


const deleteBloodBank = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const getData = await BloodBank.findById(id);

    if (!getData) {
      return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }

    await BloodBank.findByIdAndDelete(id);
    await User.findOneAndDelete({ phone: getData.phone });


    res.status(200).json(new apiResponse(200, null, "BloodBank and linked user deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});








const setAvailability = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { availability } = req.body; // Array of { bloodGroup, unitAvailability }

    const bloodBank = await BloodBank.findById(id);
    if (!bloodBank) {
        return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }

    bloodBank.availability = availability;
    const updated = await bloodBank.save();

    res.status(200).json(new apiResponse(200, updated, "Availability set successfully"));
});

const updateAvailability = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { bloodGroup, unitAvailability, amount } = req.body;

    const bloodBank = await BloodBank.findById(id);
    if (!bloodBank) {
        return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }

    const availabilityItem = bloodBank.availability.find(
        (item) => item.bloodGroup === bloodGroup
    );

    if (!availabilityItem) {
        return res.status(404).json(new apiResponse(404, null, "Blood group not found in availability"));
    }

    availabilityItem.unitAvailability = unitAvailability;
    availabilityItem.amount = amount;

    const updated = await bloodBank.save();
    res.status(200).json(new apiResponse(200, updated, "Availability updated"));
});


const deleteAvailability = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { bloodGroup } = req.body;

    const bloodBank = await BloodBank.findById(id);
    if (!bloodBank) {
        return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }

    bloodBank.availability = bloodBank.availability.filter(
        (item) => item.bloodGroup !== bloodGroup
    );

    const updated = await bloodBank.save();
    res.status(200).json(new apiResponse(200, updated, "Availability entry deleted"));
});





const addReviewToBloodBank = asyncHandler(async (req, res) => {
    const { id: bloodBankId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id; // assuming you're using auth middleware
  
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json(new apiResponse(400, null, "Rating must be between 1 and 5"));
    }
  
    const bloodBank = await BloodBank.findById(bloodBankId);
    if (!bloodBank) {
      return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }
  
    // Check if user already reviewed
    const alreadyReviewed = bloodBank.reviews.find(
      (r) => r.user.toString() === userId.toString()
    );
  
    if (alreadyReviewed) {
      return res.status(400).json(new apiResponse(400, null, "You have already reviewed this doctor"));
    }
  
    bloodBank.reviews.push({ user: userId, rating, comment });
    bloodBank.averageRating = calculateAverageRating(bloodBank.reviews);
    await bloodBank.save();
  
    res.status(201).json(new apiResponse(201, bloodBank.reviews, "Review added successfully"));
  });
  
  const updateBloodBankReview = asyncHandler(async (req, res) => {
    const { bloodBankId, reviewId } = req.params;
  
  
  
    const { rating, comment } = req.body;
    const userId = req.user._id; // authenticated user
  
    const bloodBank = await BloodBank.findById(bloodBankId);
    if (!bloodBank) {
      return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }
  
    const review = bloodBank.reviews.id(reviewId);
  
    if (!review) {
      return res.status(404).json(new apiResponse(404, null, "Review not found"));
    }
  
    // Optional: only allow the original reviewer to update
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json(new apiResponse(403, null, "Not authorized to update this review"));
    }
  
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
  
    bloodBank.averageRating = calculateAverageRating(bloodBank.reviews);
    await bloodBank.save();
  
    res.status(200).json(new apiResponse(200, bloodBank.reviews, "Review updated successfully"));
  });
  
  const deleteBloodBankReview = asyncHandler(async (req, res) => {
    const { bloodBankId, reviewId } = req.params;
    const userId = req.user._id;
  
    const bloodBank = await BloodBank.findById(bloodBankId);
    if (!bloodBank) {
      return res.status(404).json(new apiResponse(404, null, "BloodBank not found"));
    }
  
    const review = bloodBank.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json(new apiResponse(404, null, "Review not found"));
    }
  
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json(new apiResponse(403, null, "Not authorized to delete this review"));
    }
  
    review.deleteOne(); // remove the review
    bloodBank.averageRating = calculateAverageRating(bloodBank.reviews);
    await bloodBank.save();
  
    res.status(200).json(new apiResponse(200, bloodBank.reviews, "Review deleted successfully"));
  });




export {
    registerBloodBank,
    registerBloodBanks,
    getAllBloodBanks,
    getBloodBankById,
    updateBloodBank,
    deleteBloodBank,
    setAvailability,
    updateAvailability,
    deleteAvailability,
    addReviewToBloodBank,
    updateBloodBankReview,
    deleteBloodBankReview
};
