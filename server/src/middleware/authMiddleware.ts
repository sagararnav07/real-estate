import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Unauthorized - No token provided" });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      const userRole = decoded.role || "";
      
      req.user = {
        id: decoded.userId,
        role: userRole,
        email: decoded.email,
      };

      const hasAccess = allowedRoles.includes(userRole.toLowerCase());
      if (!hasAccess) {
        res.status(403).json({ 
          message: `Access Denied - requires ${allowedRoles.join(" or ")} role` 
        });
        return;
      }

      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

// Middleware to verify user is accessing their own resources
export const verifyResourceOwnership = (paramName: string = "cognitoId") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resourceId = req.params[paramName];
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (resourceId !== userId) {
      res.status(403).json({ message: "Access denied - you can only access your own resources" });
      return;
    }

    next();
  };
};
