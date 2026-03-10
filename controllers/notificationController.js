import admin from "../firebase/firebaseAdmin.js";
import Notification from "../models/Notification.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

// Create a new notification
const createNotification = asyncHandler(async (req, res) => {
  const { title, comment, userId } = req.body;

  if (!title || !comment || !userId) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "All fields are required."));
  }

  try {
    const notification = new Notification({ title, comment, userId });
    const savedNotification = await notification.save();
    res
      .status(201)
      .json(
        new apiResponse(
          201,
          savedNotification,
          "Notification created successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export const createNotifications = async ({
  title,
  comment,
  details,
  userId,
  fcmToken,
  screen,
  isRead = false,
}) => {
  try {
    if (!title || !comment || !userId) {
      throw new Error("Missing required fields: title, comment, or userId.");
    }


    console.log("screen",screen);
    


    const notification = new Notification({
      title,
      comment,
      details,
      userId,
      isRead,
      
    });
    const savedNotification = await notification.save();

   
 
    if (fcmToken) {
      const message = {
        notification: {
          title: title,
          body: comment,
        },
        data: {
          title: title,
          body: comment,
          screen: screen,
        },
        token: fcmToken,
        android: {
          priority: "high",
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
        },
      };

     
      await admin.messaging().send(message);
    }



    return savedNotification;
  } catch (error) {
    console.error("Error creating notification:", error.message);
    return null;
  }
};

// Get all notifications
const getAllNotifications = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page = 1,
    limit = 10,
    search,
    userId,
    fromDate,
    toDate,
  } = req.query;

  const searchQuery = {};

  // Filter by userId
  if (userId) {
    searchQuery.userId = userId;
  }

  // Filter by search keyword
  if (search) {
    searchQuery.$or = [
      { title: { $regex: search, $options: "i" } },
      { comment: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by date range
  if (fromDate || toDate) {
    searchQuery.createdAt = {};
    if (fromDate) {
      searchQuery.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999); // Include full day
      searchQuery.createdAt.$lte = endOfDay;
    }
  }

  try {
    if (isPagination === "true") {
      const skip = (page - 1) * limit;
      const total = await Notification.countDocuments(searchQuery);
      const notifications = await Notification.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      res.status(200).json(
        new apiResponse(
          200,
          {
            notifications,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
          },
          "Notifications fetched successfully"
        )
      );
    } else {
      const notifications = await Notification.find(searchQuery).sort({
        createdAt: -1,
      });
      res.status(200).json(
        new apiResponse(
          200,
          notifications,
          "Notifications fetched successfully"
        )
      );
    }
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});


// Get notification by ID
const getNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Notification not found"));
    }

    res
      .status(200)
      .json(
        new apiResponse(200, notification, "Notification fetched successfully")
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Update notification by ID
const updateNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Notification not found"));
    }

    Object.keys(updateData).forEach((key) => {
      notification[key] = updateData[key];
    });

    const updatedNotification = await notification.save();
    res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedNotification,
          "Notification updated successfully"
        )
      );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// Delete notification by ID
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Notification not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, null, "Notification deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createNotification,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
};
