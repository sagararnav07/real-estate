import { Request, Response, NextFunction } from "express";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Validation error class
export class ValidationError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

// Validation helper functions
export const validators = {
  isEmail: (email: string): boolean => EMAIL_REGEX.test(email),
  
  isStrongPassword: (password: string): boolean => PASSWORD_REGEX.test(password),
  
  isNonEmptyString: (value: unknown): value is string => 
    typeof value === "string" && value.trim().length > 0,
  
  isPositiveNumber: (value: unknown): boolean => 
    typeof value === "number" && value > 0,
  
  isValidId: (value: string | number): boolean => {
    const num = typeof value === "string" ? parseInt(value, 10) : value;
    return !isNaN(num) && num > 0;
  },
  
  isValidRole: (role: string): boolean => 
    ["tenant", "manager"].includes(role.toLowerCase()),
  
  isValidApplicationStatus: (status: string): boolean =>
    ["Pending", "Approved", "Denied"].includes(status),
  
  isValidPropertyType: (type: string): boolean =>
    ["Apartment", "Villa", "Condo", "Townhouse", "Studio", "Rooms"].includes(type),
  
  sanitizeString: (str: string): string => 
    str.trim().replace(/[<>]/g, ""),
  
  sanitizeFilename: (filename: string): string => {
    // Remove path traversal characters and keep only safe characters
    return filename
      .replace(/\.\./g, "")
      .replace(/[\/\\]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  },
};

// Validation schemas
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PropertyInput {
  name: string;
  description: string;
  pricePerMonth: number;
  securityDeposit: number;
  beds: number;
  baths: number;
  squareFeet: number;
  propertyType: string;
  amenities: string[];
  highlights: string[];
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface ApplicationInput {
  propertyId: number;
  tenantCognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  message: string;
}

// Validation functions
export function validateRegisterInput(input: RegisterInput): string | null {
  if (!validators.isNonEmptyString(input.email)) {
    return "Email is required";
  }
  if (!validators.isEmail(input.email)) {
    return "Invalid email format";
  }
  if (!validators.isNonEmptyString(input.password)) {
    return "Password is required";
  }
  if (!validators.isStrongPassword(input.password)) {
    return "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number";
  }
  if (!validators.isNonEmptyString(input.name)) {
    return "Name is required";
  }
  if (input.name.length < 2 || input.name.length > 100) {
    return "Name must be between 2 and 100 characters";
  }
  if (!validators.isNonEmptyString(input.role)) {
    return "Role is required";
  }
  if (!validators.isValidRole(input.role)) {
    return "Role must be 'tenant' or 'manager'";
  }
  return null;
}

export function validateLoginInput(input: LoginInput): string | null {
  if (!validators.isNonEmptyString(input.email)) {
    return "Email is required";
  }
  if (!validators.isEmail(input.email)) {
    return "Invalid email format";
  }
  if (!validators.isNonEmptyString(input.password)) {
    return "Password is required";
  }
  return null;
}

export function validatePropertyInput(input: Partial<PropertyInput>): string | null {
  if (input.name !== undefined && !validators.isNonEmptyString(input.name)) {
    return "Property name is required";
  }
  if (input.pricePerMonth !== undefined && !validators.isPositiveNumber(input.pricePerMonth)) {
    return "Price per month must be a positive number";
  }
  if (input.securityDeposit !== undefined && input.securityDeposit < 0) {
    return "Security deposit cannot be negative";
  }
  if (input.beds !== undefined && (input.beds < 0 || input.beds > 50)) {
    return "Beds must be between 0 and 50";
  }
  if (input.baths !== undefined && (input.baths < 0 || input.baths > 50)) {
    return "Baths must be between 0 and 50";
  }
  if (input.squareFeet !== undefined && (input.squareFeet < 0 || input.squareFeet > 100000)) {
    return "Square feet must be between 0 and 100,000";
  }
  if (input.propertyType !== undefined && !validators.isValidPropertyType(input.propertyType)) {
    return "Invalid property type";
  }
  return null;
}

export function validateApplicationInput(input: Partial<ApplicationInput>): string | null {
  if (input.propertyId !== undefined && !validators.isValidId(input.propertyId)) {
    return "Invalid property ID";
  }
  if (input.email !== undefined && !validators.isEmail(input.email)) {
    return "Invalid email format";
  }
  if (input.name !== undefined && !validators.isNonEmptyString(input.name)) {
    return "Name is required";
  }
  return null;
}

// Middleware to validate request params that should be numeric IDs
export const validateIdParam = (paramName: string = "id") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (!validators.isValidId(value)) {
      res.status(400).json({ message: `Invalid ${paramName}: must be a positive integer` });
      return;
    }
    next();
  };
};

// Middleware to sanitize common inputs
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        req.body[key] = validators.sanitizeString(req.body[key]);
      }
    }
  }
  next();
};
