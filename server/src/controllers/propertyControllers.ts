import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";
import { Location } from "@prisma/client";
import axios from "axios";
import path from "path";
import fs from "fs";
import prisma from "../lib/prisma";
import { validators } from "../lib/validation";

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads/properties");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cache for generated properties (stores properties by ID for 1 hour)
interface CachedProperty {
  property: any;
  expiresAt: number;
}
const generatedPropertiesCache = new Map<number, CachedProperty>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Clean expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, cached] of generatedPropertiesCache.entries()) {
    if (cached.expiresAt < now) {
      generatedPropertiesCache.delete(id);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Store a generated property in cache
function cacheProperty(property: any): void {
  generatedPropertiesCache.set(property.id, {
    property,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

// Get a cached property
function getCachedProperty(id: number): any | null {
  const cached = generatedPropertiesCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.property;
  }
  return null;
}

// Property images from Unsplash (free to use)
const propertyImages = {
  Apartment: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800",
  ],
  Villa: [
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
  ],
  Condo: [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800",
    "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800",
  ],
  Townhouse: [
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
    "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800",
  ],
  Studio: [
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800",
    "https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=800",
    "https://images.unsplash.com/photo-1630699144867-37acec97df5a?w=800",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800",
  ],
  Rooms: [
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800",
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800",
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
    "https://images.unsplash.com/photo-1598928506311-c55ez8c28b4?w=800",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  ],
};

// Amenities pool
const amenitiesPool = [
  "WasherDryer", "AirConditioning", "Dishwasher", "HighSpeedInternet",
  "Parking", "Gym", "Pool", "Balcony", "Hardwood Floors", "Pet Friendly",
  "Storage", "Fireplace", "Doorman", "Elevator", "Rooftop", "Garden"
];

// Generate random property names
const propertyNamePrefixes = [
  "Sunrise", "Lakeside", "Park View", "Urban", "Downtown", "Riverside", 
  "Skyline", "Garden", "Metropolitan", "Coastal", "Highland", "Valley",
  "Central", "Hillside", "Westside", "Eastside", "Northgate", "Southview"
];

const propertyNameSuffixes = [
  "Apartments", "Residences", "Towers", "Living", "Suites", "Place",
  "Heights", "Gardens", "Lofts", "Commons", "Estates", "Manor"
];

// Get nearby real addresses from Nominatim
async function getNearbyAddresses(lat: number, lng: number, count: number = 10): Promise<any[]> {
  const addresses: any[] = [];
  const maxAttempts = count * 3; // Try more times since some may fail
  let attempts = 0;
  
  while (addresses.length < count && attempts < maxAttempts) {
    attempts++;
    
    // Generate random offset within ~5km radius
    const latOffset = (Math.random() - 0.5) * 0.09; // ~5km
    const lngOffset = (Math.random() - 0.5) * 0.09;
    const newLat = lat + latOffset;
    const newLng = lng + lngOffset;
    
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`,
        {
          headers: { "User-Agent": "RealEstateApp/1.0" },
          timeout: 5000,
        }
      );
      
      if (response.data && response.data.address) {
        const addr = response.data.address;
        addresses.push({
          address: addr.house_number 
            ? `${addr.house_number} ${addr.road || addr.street || "Main Street"}`
            : `${Math.floor(Math.random() * 9000) + 100} ${addr.road || addr.street || "Main Street"}`,
          city: addr.city || addr.town || addr.village || addr.municipality || "Unknown City",
          state: addr.state || addr.region || "Unknown State",
          country: addr.country || "USA",
          postalCode: addr.postcode || `${Math.floor(Math.random() * 90000) + 10000}`,
          latitude: newLat,
          longitude: newLng,
        });
      }
      
      // Small delay to be nice to Nominatim
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Ignore errors and continue
    }
  }
  
  // If we couldn't get enough addresses, generate some with the base location
  while (addresses.length < count) {
    const latOffset = (Math.random() - 0.5) * 0.09;
    const lngOffset = (Math.random() - 0.5) * 0.09;
    addresses.push({
      address: `${Math.floor(Math.random() * 9000) + 100} Main Street`,
      city: "Local Area",
      state: "State",
      country: "USA",
      postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
      latitude: lat + latOffset,
      longitude: lng + lngOffset,
    });
  }
  
  return addresses;
}

// Generate realistic properties based on location
function generateProperty(address: any, index: number): any {
  const propertyTypes = ["Apartment", "Villa", "Condo", "Townhouse", "Studio", "Rooms"] as const;
  const type = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
  
  // Base price varies by property type
  const basePrices: Record<string, number> = {
    Studio: 800,
    Rooms: 600,
    Apartment: 1200,
    Condo: 1500,
    Townhouse: 2000,
    Villa: 3500,
  };
  
  // Randomize price within range
  const basePrice = basePrices[type] || 1200;
  const priceVariation = Math.floor(Math.random() * 1000) - 300;
  const price = Math.max(500, basePrice + priceVariation);
  
  // Beds and baths based on type
  const bedsConfig: Record<string, { min: number; max: number }> = {
    Studio: { min: 0, max: 0 },
    Rooms: { min: 1, max: 1 },
    Apartment: { min: 1, max: 3 },
    Condo: { min: 1, max: 3 },
    Townhouse: { min: 2, max: 4 },
    Villa: { min: 3, max: 6 },
  };
  
  const bedConfig = bedsConfig[type] || { min: 1, max: 3 };
  const beds = Math.floor(Math.random() * (bedConfig.max - bedConfig.min + 1)) + bedConfig.min;
  const baths = Math.max(1, Math.floor(beds * 0.7) + (Math.random() > 0.5 ? 1 : 0));
  
  // Square feet based on beds
  const sqftBase = type === "Studio" ? 400 : type === "Rooms" ? 200 : 500;
  const squareFeet = sqftBase + (beds * 300) + Math.floor(Math.random() * 300);
  
  // Random amenities (3-8)
  const numAmenities = Math.floor(Math.random() * 6) + 3;
  const shuffled = [...amenitiesPool].sort(() => 0.5 - Math.random());
  const selectedAmenities = shuffled.slice(0, numAmenities);
  
  // Get images for this property type
  const typeImages = propertyImages[type as keyof typeof propertyImages] || propertyImages.Apartment;
  const numPhotos = Math.floor(Math.random() * 3) + 2; // 2-4 photos
  const photoUrls = [...typeImages].sort(() => 0.5 - Math.random()).slice(0, numPhotos);
  
  // Generate name
  const prefix = propertyNamePrefixes[Math.floor(Math.random() * propertyNamePrefixes.length)];
  const suffix = propertyNameSuffixes[Math.floor(Math.random() * propertyNameSuffixes.length)];
  
  // Available from (within next 30 days)
  const availableFrom = new Date();
  availableFrom.setDate(availableFrom.getDate() + Math.floor(Math.random() * 30));
  
  return {
    id: 10000 + index, // Start from 10000 to avoid conflicts with seeded data
    name: `${prefix} ${suffix}`,
    description: `Beautiful ${type.toLowerCase()} located in ${address.city}. Features ${beds} bedroom${beds !== 1 ? 's' : ''} and ${baths} bathroom${baths !== 1 ? 's' : ''}. ${squareFeet} sq ft of modern living space with ${selectedAmenities.slice(0, 3).join(', ')} and more. Perfect for ${type === 'Studio' || type === 'Rooms' ? 'singles or couples' : 'families or roommates'}.`,
    pricePerMonth: price,
    securityDeposit: price,
    applicationFee: Math.floor(price * 0.05) + 25,
    photoUrls,
    amenities: selectedAmenities,
    highlights: [
      beds > 0 ? `${beds} Spacious Bedroom${beds > 1 ? 's' : ''}` : "Open Floor Plan",
      `${baths} Modern Bathroom${baths > 1 ? 's' : ''}`,
      selectedAmenities[0] || "Great Location",
      "Move-in Ready",
    ],
    isPetsAllowed: selectedAmenities.includes("Pet Friendly"),
    isParkingIncluded: selectedAmenities.includes("Parking"),
    beds,
    baths,
    squareFeet,
    propertyType: type,
    availableFrom: availableFrom.toISOString(),
    isAvailable: true,
    location: {
      id: 10000 + index,
      address: address.address,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      coordinates: {
        latitude: address.latitude,
        longitude: address.longitude,
      },
    },
    // Virtual fields for compatibility
    managerCognitoId: "system-generated",
    locationId: 10000 + index,
    averageRating: 3.5 + (Math.random() * 1.5), // Random rating between 3.5 and 5.0
    numberOfReviews: Math.floor(Math.random() * 50) + 5, // Random reviews between 5 and 55
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      favoriteIds,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      latitude,
      longitude,
    } = req.query;

    let whereConditions: Prisma.Sql[] = [];

    if (favoriteIds) {
      const favoriteIdsArray = (favoriteIds as string).split(",").map(Number);
      whereConditions.push(
        Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`
      );
    }

    if (priceMin) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`
      );
    }

    if (priceMax) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`
      );
    }

    if (beds && beds !== "any") {
      whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`);
    }

    if (baths && baths !== "any") {
      whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`);
    }

    if (squareFeetMin) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`
      );
    }

    if (squareFeetMax) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`
      );
    }

    if (propertyType && propertyType !== "any") {
      whereConditions.push(
        Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`
      );
    }

    if (amenities && amenities !== "any") {
      const amenitiesArray = (amenities as string).split(",");
      whereConditions.push(Prisma.sql`p.amenities @> ${amenitiesArray}`);
    }

    if (availableFrom && availableFrom !== "any") {
      const availableFromDate =
        typeof availableFrom === "string" ? availableFrom : null;
      if (availableFromDate) {
        const date = new Date(availableFromDate);
        if (!isNaN(date.getTime())) {
          whereConditions.push(
            Prisma.sql`EXISTS (
              SELECT 1 FROM "Lease" l 
              WHERE l."propertyId" = p.id 
              AND l."startDate" <= ${date.toISOString()}
            )`
          );
        }
      }
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInKilometers = 50; // 50km radius for nearby properties
      const degrees = radiusInKilometers / 111; // Converts kilometers to degrees

      whereConditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates::geometry,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${degrees}
        )`
      );
    }

    const completeQuery = Prisma.sql`
      SELECT 
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'longitude', ST_X(l."coordinates"::geometry),
            'latitude', ST_Y(l."coordinates"::geometry)
          )
        ) as location
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      ${
        whereConditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
          : Prisma.empty
      }
    `;

    let properties: any[] = await prisma.$queryRaw(completeQuery);

    // If no properties found and we have coordinates, generate realistic nearby properties
    if ((!properties || properties.length === 0) && latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      
      console.log(`No seeded properties found near ${lat}, ${lng}. Generating realistic properties...`);
      
      try {
        // Get real addresses near the user's location
        const nearbyAddresses = await getNearbyAddresses(lat, lng, 8);
        
        // Generate properties from these addresses
        let generatedProperties = nearbyAddresses.map((address, index) => 
          generateProperty(address, index)
        );
        
        // Apply filters to generated properties
        if (priceMin) {
          generatedProperties = generatedProperties.filter(p => p.pricePerMonth >= Number(priceMin));
        }
        if (priceMax) {
          generatedProperties = generatedProperties.filter(p => p.pricePerMonth <= Number(priceMax));
        }
        if (beds && beds !== "any") {
          generatedProperties = generatedProperties.filter(p => p.beds >= Number(beds));
        }
        if (baths && baths !== "any") {
          generatedProperties = generatedProperties.filter(p => p.baths >= Number(baths));
        }
        if (propertyType && propertyType !== "any") {
          generatedProperties = generatedProperties.filter(p => p.propertyType === propertyType);
        }
        if (squareFeetMin) {
          generatedProperties = generatedProperties.filter(p => p.squareFeet >= Number(squareFeetMin));
        }
        if (squareFeetMax) {
          generatedProperties = generatedProperties.filter(p => p.squareFeet <= Number(squareFeetMax));
        }
        
        // Cache all generated properties for later retrieval
        console.log(`[getProperties] Caching ${generatedProperties.length} generated properties`);
        generatedProperties.forEach(p => {
          console.log(`[getProperties] Caching property ${p.id} - ${p.location.city}, ${p.location.country}`);
          cacheProperty(p);
        });
        console.log(`[getProperties] Cache size after: ${generatedPropertiesCache.size}`);
        
        properties = generatedProperties;
      } catch (genError) {
        console.error("Error generating properties:", genError);
        // Return empty array if generation fails
        properties = [];
      }
    }

    res.json(properties);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving properties: ${error.message}` });
  }
};

export const getProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query; // Accept location for fallback
    const propertyId = Number(id);
    
    console.log(`[getProperty] Fetching property ${propertyId}, coords: lat=${latitude}, lng=${longitude}`);
    console.log(`[getProperty] Cache size: ${generatedPropertiesCache.size}`);
    
    // Check if this is a generated property ID (>= 10000)
    if (propertyId >= 10000) {
      // First, try to get from cache (this preserves the original location)
      const cachedProperty = getCachedProperty(propertyId);
      if (cachedProperty) {
        console.log(`[getProperty] Cache HIT for ${propertyId} - location: ${cachedProperty.location.city}, ${cachedProperty.location.country}`);
        res.json(cachedProperty);
        return;
      }
      
      console.log(`[getProperty] Cache MISS for ${propertyId}`);
      
      // If not in cache but we have coordinates, generate with user's location
      if (latitude && longitude) {
        const lat = parseFloat(latitude as string);
        const lng = parseFloat(longitude as string);
        const index = propertyId - 10000;
        
        console.log(`[getProperty] Regenerating property ${propertyId} near user location: ${lat}, ${lng}`);
        
        try {
          // Get a real address near user's location for this property
          const addresses = await getNearbyAddresses(lat, lng, 1);
          const address = addresses[0];
          
          // Generate property with real address
          const generatedProperty = generateProperty(address, index);
          generatedProperty.id = propertyId; // Ensure correct ID
          
          // Cache it for future requests
          cacheProperty(generatedProperty);
          
          res.json(generatedProperty);
          return;
        } catch (error) {
          console.error("Error generating property with location:", error);
          // Fall through to fallback
        }
      }
      
      // Fallback: Generate with consistent but generic data
      const index = propertyId - 10000;
      const propertyTypes = ["Apartment", "Villa", "Condo", "Townhouse", "Studio", "Rooms"] as const;
      const type = propertyTypes[index % propertyTypes.length];
      
      const basePrices: Record<string, number> = {
        Studio: 800, Rooms: 600, Apartment: 1200, Condo: 1500, Townhouse: 2000, Villa: 3500,
      };
      const price = basePrices[type] + (index * 50) % 800;
      
      const bedsConfig: Record<string, { min: number; max: number }> = {
        Studio: { min: 0, max: 0 }, Rooms: { min: 1, max: 1 }, Apartment: { min: 1, max: 3 },
        Condo: { min: 1, max: 3 }, Townhouse: { min: 2, max: 4 }, Villa: { min: 3, max: 6 },
      };
      const bedConfig = bedsConfig[type];
      const beds = bedConfig.min + (index % (bedConfig.max - bedConfig.min + 1));
      const baths = Math.max(1, Math.floor(beds * 0.7) + (index % 2));
      const squareFeet = (type === "Studio" ? 400 : type === "Rooms" ? 200 : 500) + (beds * 300) + (index * 50) % 300;
      
      const typeImages = propertyImages[type as keyof typeof propertyImages] || propertyImages.Apartment;
      
      const prefix = propertyNamePrefixes[index % propertyNamePrefixes.length];
      const suffix = propertyNameSuffixes[index % propertyNameSuffixes.length];
      
      const selectedAmenities = amenitiesPool.slice(index % 5, (index % 5) + 5);
      
      // Use provided coordinates or default
      const propLat = latitude ? parseFloat(latitude as string) + (index * 0.01) : 40.7128 + (index * 0.01);
      const propLng = longitude ? parseFloat(longitude as string) + (index * 0.01) : -74.006 + (index * 0.01);
      
      const generatedProperty = {
        id: propertyId,
        name: `${prefix} ${suffix}`,
        description: `Beautiful ${type.toLowerCase()} with ${beds} bedroom${beds !== 1 ? 's' : ''} and ${baths} bathroom${baths !== 1 ? 's' : ''}. ${squareFeet} sq ft of modern living space. Features include ${selectedAmenities.slice(0, 3).join(', ')} and more.`,
        pricePerMonth: price,
        securityDeposit: price,
        applicationFee: Math.floor(price * 0.05) + 25,
        photoUrls: typeImages,
        amenities: selectedAmenities,
        highlights: [
          beds > 0 ? `${beds} Spacious Bedroom${beds > 1 ? 's' : ''}` : "Open Floor Plan",
          `${baths} Modern Bathroom${baths > 1 ? 's' : ''}`,
          selectedAmenities[0] || "Great Location",
          "Move-in Ready",
        ],
        isPetsAllowed: selectedAmenities.includes("Pet Friendly"),
        isParkingIncluded: selectedAmenities.includes("Parking"),
        beds,
        baths,
        squareFeet,
        propertyType: type,
        availableFrom: new Date().toISOString(),
        isAvailable: true,
        location: {
          id: propertyId,
          address: `${100 + index * 10} Local Street`,
          city: "Your Area",
          state: "Local State",
          country: "Your Country",
          postalCode: `${10000 + index}`,
          coordinates: {
            latitude: propLat,
            longitude: propLng,
          },
        },
        managerCognitoId: "system-generated",
        locationId: propertyId,
        averageRating: 3.5 + ((index % 15) / 10),
        numberOfReviews: 10 + (index * 3) % 40,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      res.json(generatedProperty);
      return;
    }
    
    // Regular database property
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        location: true,
      },
    });

    if (property) {
      const coordinates: { coordinates: string }[] =
        await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

      const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
      const longitude = geoJSON.coordinates[0];
      const latitude = geoJSON.coordinates[1];

      const propertyWithCoordinates = {
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude,
            latitude,
          },
        },
      };
      res.json(propertyWithCoordinates);
    } else {
      res.status(404).json({ message: "Property not found" });
    }
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error retrieving property: ${err.message}` });
  }
};

export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      managerCognitoId,
      ...propertyData
    } = req.body;

    // Save files locally and generate URLs
    const photoUrls = await Promise.all(
      files.map(async (file) => {
        const filename = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        
        // Return relative URL - can be served via static middleware
        return `/uploads/properties/${filename}`;
      })
    );

    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
      {
        street: address,
        city,
        country,
        postalcode: postalCode,
        format: "json",
        limit: "1",
      }
    ).toString()}`;
    const geocodingResponse = await axios.get(geocodingUrl, {
      headers: {
        "User-Agent": "RealEstateApp (justsomedummyemail@gmail.com",
      },
    });
    const [longitude, latitude] =
      geocodingResponse.data[0]?.lon && geocodingResponse.data[0]?.lat
        ? [
            parseFloat(geocodingResponse.data[0]?.lon),
            parseFloat(geocodingResponse.data[0]?.lat),
          ]
        : [0, 0];

    // create location
    const [location] = await prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

    // create property
    const newProperty = await prisma.property.create({
      data: {
        ...propertyData,
        photoUrls,
        locationId: location.id,
        managerCognitoId,
        amenities:
          typeof propertyData.amenities === "string"
            ? propertyData.amenities.split(",")
            : [],
        highlights:
          typeof propertyData.highlights === "string"
            ? propertyData.highlights.split(",")
            : [],
        isPetsAllowed: propertyData.isPetsAllowed === "true",
        isParkingIncluded: propertyData.isParkingIncluded === "true",
        pricePerMonth: parseFloat(propertyData.pricePerMonth),
        securityDeposit: parseFloat(propertyData.securityDeposit),
        applicationFee: parseFloat(propertyData.applicationFee),
        beds: parseInt(propertyData.beds),
        baths: parseFloat(propertyData.baths),
        squareFeet: parseInt(propertyData.squareFeet),
      },
      include: {
        location: true,
        manager: true,
      },
    });

    res.status(201).json(newProperty);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error creating property: ${err.message}` });
  }
};

export const deleteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Number(id);

    // Get the property to verify ownership and get locationId
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { location: true },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Verify the manager owns this property
    if (property.managerCognitoId !== req.user?.id) {
      res.status(403).json({ message: "You can only delete your own properties" });
      return;
    }

    // Delete related records first (leases, applications, etc.)
    await prisma.lease.deleteMany({ where: { propertyId } });
    await prisma.application.deleteMany({ where: { propertyId } });

    // Delete the property
    await prisma.property.delete({ where: { id: propertyId } });

    // Delete the location
    if (property.locationId) {
      await prisma.location.delete({ where: { id: property.locationId } });
    }

    res.json({ message: "Property deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting property:", err);
    res.status(500).json({ message: `Error deleting property: ${err.message}` });
  }
};
