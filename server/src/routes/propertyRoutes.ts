import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
  deleteProperty,
} from "../controllers/propertyControllers";
import { getPropertyLeases, getPropertyPayments } from "../controllers/leaseControllers";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", getProperties);
router.get("/:id", getProperty);
router.get("/:propertyId/leases", authMiddleware(["manager"]), getPropertyLeases);
router.get("/:propertyId/payments", authMiddleware(["manager"]), getPropertyPayments);
router.post(
  "/",
  authMiddleware(["manager"]),
  upload.array("photos"),
  createProperty
);
router.delete("/:id", authMiddleware(["manager"]), deleteProperty);

export default router;
