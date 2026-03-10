import { decrypt } from "./ccavutil.js";

import User from "../../models/User.modal.js";

import PharmacyAppointment from "../../models/pharmacybooking.modal.js";
import Pharmacy from "../../models/Pharmacy.modal.js";
import PharmacyWallet from "../../models/pharmacyWalletHistory.modal.js";

import crypto from "crypto";
import qs from "querystring";
import { createNotifications } from "../../controllers/notificationController.js";

// live
const workingKey = "242144CFEA6B4926EBFDFDCE294ED69C";
// local
// const workingKey = "12BC2D2A85C6368DC0F7B5B6F043DA11";

export async function postPharmacyResRes(req, res) {
  try {
    const encResp = req.body.encResp;
    if (!encResp) return res.status(400).send("Missing encResp");

    // Decrypt
    const md5 = crypto.createHash("md5").update(workingKey).digest();
    const keyBase64 = Buffer.from(md5).toString("base64");
    const ivBase64 = Buffer.from([...Array(16).keys()]).toString("base64");

    const ccavResponse = decrypt(encResp, keyBase64, ivBase64);

    // Parse decrypted string
    const data = qs.parse(ccavResponse);

    
    
    
    // Fetch appointment
    const order = await PharmacyAppointment.findById(data.order_id);
    
    
    if (!order) return res.status(404).send("order not found");
    
    
    const existingPharmacy = await Pharmacy.findById(order?.pharmacy);
    
    const patient = await User.findById(order?.patient);
    if (!existingPharmacy) {
      return res
      .status(404)
      .json(new apiResponse(404, null, "Pharmacy not found"));
    }
    
    
    console.log("order===>",order);
    console.log("existingPharmacy===>",existingPharmacy);
    console.log("patient===>",patient);


    // Verify and update DB
 if (data.order_status === "Success") {
     
   order.status = "Confirmed";
      order.paymentStatus = "Completed";
      order.paymentDetails.transactionId = data.tracking_id;
      order.paymentDetails.paymentDate = new Date();

      const actualFee = Number(order.amount);
      existingPharmacy.wallet += actualFee;

      await PharmacyWallet.create({
        PharmacyId: existingPharmacy._id,
        patientId: patient._id,
        consultationId: order._id,
        amount: actualFee,
        paymentType: "credited",
        note: `Pharmacy service fee credited  on ${new Date().toLocaleDateString()}`,
      });

      await existingPharmacy.save();

      const savedAppointment = await order.save();

      const populatedAppointment = await PharmacyAppointment.findById(
        savedAppointment._id
      )
        .populate({
          path: "pharmacy",
          select:
            "name onlinePayment cod email phone gender  profilepic address",
        })
        .populate({
          path: "patient",
          select: "phone name gender email accountType address",
        });

      await createNotifications({
        title: "Payment Successfuly",
        comment:
          "Your appointment has been successfully booked. We look forward to seeing you soon!",
        details: populatedAppointment.toObject(),
        userId: patient,
        fcmToken: existingPharmacy?.fcmToken,
        screen: "Home",
      });
   
    } else {
      order.paymentStatus = data.order_status;
      order.paymentDetails.transactionId = data.tracking_id;
      order.paymentDetails.paymentDate = new Date();

      const savedAppointment = await order.save();

     const populatedAppointment = await PharmacyAppointment.findById(
        savedAppointment._id
      )
        .populate({
          path: "pharmacy",
          select:
            "name onlinePayment cod email phone gender  profilepic address",
        })
        .populate({
          path: "patient",
          select: "phone name gender email accountType address",
        });
      await createNotifications({
        title: ` Your Payment Has ${data.order_status}`,
        comment: `Your payment could not be completed. Please try again or contact support.`,
        details: populatedAppointment.toObject(),
        userId: patient,
        fcmToken: existingPharmacy?.fcmToken,
       screen: "Home",
      });
    }

    await order.save();

    // Redirect to frontend
    if (data.order_status === "Success") {
      return res.redirect(
        `https://doctorsadda.com/success`
      );
    } else {
      return res.redirect(
        `https://doctorsadda.com/failed`
      );
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
}
