import { Router } from "express";
import {
    getDashboardStats, newPassswordAfterOTPVerified, createbid, updateAbid, dashboardOverviewstat,
    dashboardchartstat, getAllusertech, gettargetDashboardstats, createtarget, updatetarget, targetstat,
    targetpercentstat, targetteamstat, targetrevenuestat
} from "../controllers/admin/admin";
import { getleaddata, createlead, getAllleads, getAlead, updateAlead, getAllstatus } from "../controllers/lead/lead";
// import { checkAdminAuth } from "../middleware/check-auth";
import { upload } from "../configF/multer";
import { checkMulter } from "../lib/errors/error-response-handler"
import { verifyOtpPasswordReset } from "src/controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";



const router = Router();

router.post("/verify-otp", verifyOtpPasswordReset)
router.patch("/new-password-otp-verified", newPassswordAfterOTPVerified)
router.get("/dashboard", checkAuth, getDashboardStats)
router.get("/dashboardOverviewstat", checkAuth, dashboardOverviewstat)
router.get("/dashboardchartstat", checkAuth, dashboardchartstat)

// router.route("/dashboardOverviewstat").post(checkAuth, dashboardOverviewstat)
// router.route("/dashboardchartstat").post(checkAuth, dashboardchartstat)


router.get("/lead-data", checkAuth, getleaddata)
router.route("/lead").post(checkAuth, createlead).get(checkAuth, getAllleads)
router.route("/lead/:id").get(checkAuth, getAlead).patch(checkAuth, updateAlead)
router.get("/status", checkAuth, getAllstatus)
router.route("/target").post(checkAuth, createtarget).patch(checkAuth, updatetarget)
router.route("/target-data").post(checkAuth, getAllusertech)
router.get("/target-dashboard", checkAuth, gettargetDashboardstats)

router.get("/target-stat", checkAuth, targetstat)
router.get("/target-percentage-stat", checkAuth, targetpercentstat)
router.get("/target-team-earning-stat", checkAuth, targetteamstat)
router.get("/target-revenue-stat", checkAuth, targetrevenuestat)

// router.route("/target-stat").post(checkAuth, targetstat)
// router.route("/target-percentage-stat").post(checkAuth, targetpercentstat)
// router.route("/target-team-earning-stat").post(checkAuth, targetteamstat)
// router.route("/target-revenue-stat").post(checkAuth, targetrevenuestat)

router.route("/bid").post(checkAuth, createbid)
router.route("/bid/:id").patch(checkAuth, updateAbid)

export { router }