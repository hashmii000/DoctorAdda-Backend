// Importing modules using ES Module syntax
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import connectDB from "./config/db.js";

// Import Routes
import categoryRoutes from "./router/categoryRoutes.js";
import addsRoutes from "./router/addsRoutes.js";
import healthCardRoutes from "./router/HealthCardRoutes.js";
import servicesRoutes from "./router/servicesRoutes.js";
import doctorRoutes from "./router/doctorRoutes.js";
import uploadRoutes from "./router/uploadRoutes.js";
import authRoutes from "./router/authRoutes.js";
import appointmentRoutes from "./router/appointmentRoutes.js";
import hospitalRoutes from "./router/hospitalRoutes.js";
import facilitiesRoutes from "./router/facilitieRoutes.js";
import bloodBankRoutes from "./router/bloodBankRoutes.js";
import ambulanceRoutes from "./router/ambulanceRoutes.js";
import chatRoutes from "./router/chatRoutes.js";
import pharmacyRoutes from "./router/pharmacyRoutes.js";
import diagnosticsRoutes from "./router/diagnosticRoutes.js";
import globalSearchRoutes from "./router/globalSearchRoutes.js";
import doctorReferralsRoutes from "./router/doctorReferalRoutes.js";
import diagnosticBookingRoutes from "./router/diagnosticBookingRoutes.js";
import pharmacyBookingRoutes from "./router/pharmacybookingRoutes.js";
import notificationRoutes from "./router/notificationRoutes.js";
import hospitalJobPostRoutes from "./router/HospitalJobPostingRoutes.js";

import doctorWalletRoutes from "./router/doctorWalletRoutes.js";
import diagnosticWalletRoutes from "./router/diagnosticWalletRoutes.js";
import pharmacyWalletRoutes from "./router/pharmacyWalletRoutes.js";
import hospitalWalletRoutes from "./router/hospitalWalletRoutes.js";
import showIntrestRoutes from "./router/showIntrestRoutes.js";
import hospitalAppointmentRoutes from "./router/HospitalBookingRoutes.js";
import preLaunchRoutes from "./router/preLaunchRoutes.js";
import contactUsRoutes from "./router/ContactUsRoutes.js";
import medicineRoutes from "./router/medicineRoutes.js";
import recentSearchRoutes from "./router/RecentLocationSearchRoutes.js";
import ambulanceDetailsRoutes from "./router/AmbulanceDetailsRoutes.js";
import paymentMethodRoutes from "./router/PaymentMethodRoutes.js";
import refundRoutes from "./router/RefundRoutes.js";
import adminPayoutRoutes from "./router/adminPayoutRoutes.js";

import adminRoutes from "./router/adminRoutes.js";
import bannerRoutes from "./router/bannerRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { postRes } from "./payment/ccavenue/ccavResponseHandler.js";
import { postHospitalRes } from "./payment/ccavenue/ccavhospitalPaymentResHandler.js";
import { postDiagnosticsRes } from "./payment/ccavenue/ccavDiagnosticsResponseHandler.js";
import { postPharmacyResRes } from "./payment/ccavenue/ccavPharmacyResponseHandler.js";

import reportChatRoutes from "./router/reportChatRoutes.js";



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ES Module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to Database
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ Database connected successfully!");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

// Middleware
app.options("*", cors());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static("public"));
app.set("views", `${process.cwd()}/public`);
app.engine("html", ejs.renderFile);

// Error handler middleware
app.use(errorHandler);

// Routes
app.use("/api/ambulance", ambulanceRoutes);
app.use("/api/facilities", facilitiesRoutes);
// app.post("/api/appointment/payment", ccavRequestHandler);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/bloodBank", bloodBankRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/adds", addsRoutes);
app.use("/api/healthCard", healthCardRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/hospitalJobPost", hospitalJobPostRoutes);
app.use("/api/ambulanceDetails", ambulanceDetailsRoutes);
app.use("/api/paymentMethod", paymentMethodRoutes);
app.use("/api/refund", refundRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/api/banner", bannerRoutes);
app.use("/api/show-intrests", showIntrestRoutes);

app.use("/api/doctor", doctorRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/diagnostics", diagnosticsRoutes);
app.use("/api/contactUs", contactUsRoutes);
app.use("/api", globalSearchRoutes);

// admin
app.use("/api/admin", adminRoutes);

// wallet
app.use("/api/doctorWallet", doctorWalletRoutes);
app.use("/api/diagnosticWallet", diagnosticWalletRoutes);
app.use("/api/pharmacyWallet", pharmacyWalletRoutes);
app.use("/api/hospitalWallet", hospitalWalletRoutes);

// appointment
app.use("/api/appointment", appointmentRoutes);
app.use("/api/hospitalAppointment", hospitalAppointmentRoutes);
app.use("/api/diagnosticBooking", diagnosticBookingRoutes);
app.use("/api/pharmacyBooking", pharmacyBookingRoutes);
app.use("/api/medicine", medicineRoutes);
app.use("/api/recentSearch", recentSearchRoutes);
// image chat 
app.use("/api/chat", reportChatRoutes);

app.get("/about", (req, res) => {
  res.render("dataFrom.html");
});

app.post("/ccavResponseHandler", (req, res) => {
  postRes(req, res);
});
app.post("/ccavHospitalResponseHandler", (req, res) => {
  postHospitalRes(req, res);
});
app.post("/ccavDiagnosticsResponseHandler", (req, res) => {
  postDiagnosticsRes(req, res);
});
app.post("/ccavPharmacyResponseHandler", (req, res) => {
  postPharmacyResRes(req, res);
});

// doctor referrals
app.use("/api/doctor-referrals", doctorReferralsRoutes);
app.use("/api/preLaunch", preLaunchRoutes);

// doctor Payout
app.use("/api/admin", adminPayoutRoutes);

// Start the Server
startServer();
