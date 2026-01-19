import express from "express";
import { register, login, getMe } from "../controllers/authControllers";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", getMe);

export default router;
