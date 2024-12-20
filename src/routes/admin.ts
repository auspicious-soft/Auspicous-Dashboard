import { Router } from "express";
import {  getDashboardStats,  newPassswordAfterOTPVerified, createbid, updateAbid, dashboardOverviewstat, dashboardchartstat, getAllusertech, gettargetDashboardstats, createtarget, updatetarget} from "../controllers/admin/admin";
import {  getleaddata, createlead, getAllleads, getAlead, updateAlead, getAllstatus} from "../controllers/lead/lead";
// import { checkAdminAuth } from "../middleware/check-auth";
import { upload } from "../configF/multer";
import { checkMulter } from "../lib/errors/error-response-handler"
import { verifyOtpPasswordReset } from "src/controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";



const router = Router();

router.post("/verify-otp", verifyOtpPasswordReset)
router.patch("/new-password-otp-verified", newPassswordAfterOTPVerified)
router.get("/dashboard", checkAuth, getDashboardStats)
router.route("/dashboardOverviewstat").post(checkAuth, dashboardOverviewstat)
router.route("/dashboardchartstat").post(checkAuth, dashboardchartstat)


router.get("/lead-data", checkAuth, getleaddata)
router.route("/lead").post(checkAuth, createlead).get(checkAuth, getAllleads)
router.route("/lead/:id").get(checkAuth, getAlead).patch(checkAuth, updateAlead)
router.get("/status", checkAuth, getAllstatus)
router.route("/target").get(checkAuth, getAllusertech).post(checkAuth, createtarget).patch(checkAuth, updatetarget)
router.get("/target-dashboard", checkAuth, gettargetDashboardstats)


router.route("/bid").post(checkAuth, createbid)
router.route("/bid/:id").patch(checkAuth, updateAbid)

export { router }