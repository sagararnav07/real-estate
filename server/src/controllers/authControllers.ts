import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { validateRegisterInput, validateLoginInput } from "../lib/validation";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY: SignOptions["expiresIn"] = (process.env.JWT_EXPIRY || "7d") as SignOptions["expiresIn"];

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    const validationError = validateRegisterInput({ email, password, name, role });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = role.toLowerCase();

    // Check if user already exists
    const existingTenant = await prisma.tenant.findUnique({ where: { email: normalizedEmail } });
    const existingManager = await prisma.manager.findUnique({ where: { email: normalizedEmail } });

    if (existingTenant || existingManager) {
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    // Hash password with appropriate cost factor
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique ID
    const cognitoId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let user;
    if (normalizedRole === "tenant") {
      user = await prisma.tenant.create({
        data: {
          cognitoId,
          name: name.trim(),
          email: normalizedEmail,
          phoneNumber: "",
          password: hashedPassword,
        },
      });
    } else {
      user = await prisma.manager.create({
        data: {
          cognitoId,
          name: name.trim(),
          email: normalizedEmail,
          phoneNumber: "",
          password: hashedPassword,
        },
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.cognitoId,
        email: user.email,
        role: normalizedRole,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      token,
      user: {
        userId: user.cognitoId,
        email: user.email,
        name: user.name,
        role: normalizedRole,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error registering user: ${message}` });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validationError = validateLoginInput({ email, password });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check tenant first
    let user = await prisma.tenant.findUnique({ where: { email: normalizedEmail } });
    let role = "tenant";

    // If not found, check manager
    if (!user) {
      user = await prisma.manager.findUnique({ where: { email: normalizedEmail } });
      role = "manager";
    }

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Check if user has a password set
    if (!user.password) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.cognitoId,
        email: user.email,
        role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      token,
      user: {
        userId: user.cognitoId,
        email: user.email,
        name: user.name,
        role,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error logging in: ${message}` });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    let user;
    if (decoded.role === "tenant") {
      user = await prisma.tenant.findUnique({
        where: { cognitoId: decoded.userId },
        include: { favorites: true },
      });
    } else {
      user = await prisma.manager.findUnique({
        where: { cognitoId: decoded.userId },
      });
    }

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      userId: user.cognitoId,
      email: user.email,
      name: user.name,
      role: decoded.role,
      userInfo: user,
    });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
