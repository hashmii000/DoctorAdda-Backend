import axios from "axios";

export const sendDltOtp = async (phone, otp) => {
  const expiryMinutes = 5;

  const message = `Dear Customer, your OTP for login/verification is ${otp}. This OTP is valid for ${expiryMinutes} minutes. Do not share it with anyone. - DCTSHP`;

  const encodedMessage = encodeURIComponent(message);

  const smsUrl = `https://sms.sibook.in/http-tokenkeyapi.php?authentic-key=${process.env.SMS_AUTH_KEY}&senderid=DCTSHP&route=2&number=${phone}&message=${encodedMessage}&templateid=1007371849134488966`;

  const response = await axios.get(smsUrl);

  console.log("UTILS SMS RESPONSE:", response.data);

  if (!response.data || response.data.Status !== "Success") {
    throw new Error(response.data?.Description || "SMS sending failed");
  }

  return response.data;
};