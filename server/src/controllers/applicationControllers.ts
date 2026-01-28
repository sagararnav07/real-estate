import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { validators } from "../lib/validation";

function calculateNextPaymentDate(startDate: Date): Date {
  const today = new Date();
  const nextPaymentDate = new Date(startDate);
  while (nextPaymentDate <= today) {
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
  }
  return nextPaymentDate;
}

export const listApplications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, userType } = req.query;

    let whereClause = {};

    if (userId && userType) {
      if (userType === "tenant") {
        whereClause = { tenantCognitoId: String(userId) };
      } else if (userType === "manager") {
        whereClause = {
          property: {
            managerCognitoId: String(userId),
          },
        };
      }
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        property: {
          include: {
            location: true,
            manager: true,
          },
        },
        tenant: true,
        lease: true,
      },
      orderBy: { applicationDate: "desc" },
    });

    const formattedApplications = applications.map((app) => ({
      ...app,
      property: {
        ...app.property,
        address: app.property.location.address,
      },
      manager: app.property.manager,
      lease: app.lease
        ? {
            ...app.lease,
            nextPaymentDate: calculateNextPaymentDate(app.lease.startDate),
          }
        : null,
    }));

    res.json(formattedApplications);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error retrieving applications: ${message}` });
  }
};

export const createApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      applicationDate,
      propertyId,
      tenantCognitoId,
      name,
      email,
      phoneNumber,
      message,
    } = req.body;

    // Validate required fields
    if (!propertyId || !validators.isValidId(propertyId)) {
      res.status(400).json({ message: "Valid property ID is required" });
      return;
    }

    if (!tenantCognitoId || !validators.isNonEmptyString(tenantCognitoId)) {
      res.status(400).json({ message: "Tenant ID is required" });
      return;
    }

    if (!validators.isNonEmptyString(name)) {
      res.status(400).json({ message: "Name is required" });
      return;
    }

    if (!validators.isEmail(email)) {
      res.status(400).json({ message: "Valid email is required" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, pricePerMonth: true, securityDeposit: true },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Check if tenant already has a pending application for this property
    const existingApplication = await prisma.application.findFirst({
      where: {
        propertyId,
        tenantCognitoId,
        status: "Pending",
      },
    });

    if (existingApplication) {
      res.status(400).json({ message: "You already have a pending application for this property" });
      return;
    }

    // Create application without lease (lease created only on approval)
    const newApplication = await prisma.application.create({
      data: {
        applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
        status: "Pending",
        name: validators.sanitizeString(name),
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber || "",
        message: message ? validators.sanitizeString(message) : "",
        property: {
          connect: { id: propertyId },
        },
        tenant: {
          connect: { cognitoId: tenantCognitoId },
        },
      },
      include: {
        property: {
          include: { location: true },
        },
        tenant: true,
      },
    });

    res.status(201).json(newApplication);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error creating application: ${message}` });
  }
};

export const updateApplicationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ID
    if (!validators.isValidId(id)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    // Validate status
    if (!validators.isValidApplicationStatus(status)) {
      res.status(400).json({ message: "Status must be 'Pending', 'Approved', or 'Denied'" });
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: Number(id) },
      include: {
        property: true,
        tenant: true,
        lease: true,
      },
    });

    if (!application) {
      res.status(404).json({ message: "Application not found" });
      return;
    }

    // Use transaction for approval to ensure data consistency
    if (status === "Approved") {
      // Check if lease already exists
      if (application.leaseId) {
        res.status(400).json({ message: "Application already has a lease" });
        return;
      }

      const updatedApplication = await prisma.$transaction(async (tx) => {
        // Create lease
        const newLease = await tx.lease.create({
          data: {
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            rent: application.property.pricePerMonth,
            deposit: application.property.securityDeposit,
            propertyId: application.propertyId,
            tenantCognitoId: application.tenantCognitoId,
          },
        });

        // Connect tenant to property
        await tx.property.update({
          where: { id: application.propertyId },
          data: {
            tenants: {
              connect: { cognitoId: application.tenantCognitoId },
            },
          },
        });

        // Update application with lease
        return tx.application.update({
          where: { id: Number(id) },
          data: { 
            status, 
            leaseId: newLease.id,
          },
          include: {
            property: { include: { location: true } },
            tenant: true,
            lease: true,
          },
        });
      });

      res.json(updatedApplication);
    } else {
      // For Pending or Denied status
      const updatedApplication = await prisma.application.update({
        where: { id: Number(id) },
        data: { status },
        include: {
          property: { include: { location: true } },
          tenant: true,
          lease: true,
        },
      });

      res.json(updatedApplication);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: `Error updating application status: ${message}` });
  }
};
