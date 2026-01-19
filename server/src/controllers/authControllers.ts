import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    if (!["tenant", "manager"].includes(role.toLowerCase())) {
      res.status(400).json({ message: "Role must be 'tenant' or 'manager'" });
      return;
    }

    // Check if user already exists
    const existingTenant = await prisma.tenant.findUnique({ where: { email } });
    const existingManager = await prisma.manager.findUnique({ where: { email } });

    if (existingTenant || existingManager) {
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique ID
    const cognitoId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let user;
    if (role.toLowerCase() === "tenant") {
      user = await prisma.tenant.create({
        data: {
          cognitoId,
          name,
          email,
          phoneNumber: "",
          password: hashedPassword,
        },
      });
    } else {
      user = await prisma.manager.create({
        data: {
          cognitoId,
          name,
          email,
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
        role: role.toLowerCase(),
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        userId: user.cognitoId,
        email: user.email,
        name: user.name,
        role: role.toLowerCase(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: `Error registering user: ${error.message}` });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Check tenant first
    let user = await prisma.tenant.findUnique({ where: { email } });
    let role = "tenant";

    // If not found, check manager
    if (!user) {
      user = await prisma.manager.findUnique({ where: { email } });
      role = "manager";
    }

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password || "");
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
      { expiresIn: "7d" }
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
  } catch (error: any) {
    res.status(500).json({ message: `Error logging in: ${error.message}` });
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
  } catch (error: any) {
    res.status(401).json({ message: "Invalid token" });
  }
};
