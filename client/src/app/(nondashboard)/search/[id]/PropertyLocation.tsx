"use client";

import { useGetPropertyQuery } from "@/state/api";
import { Compass, MapPin } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number }>({});
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Get user coordinates from localStorage on mount
  useEffect(() => {
    const savedCoords = localStorage.getItem("userCoordinates");
    if (savedCoords) {
      try {
        const parsed = JSON.parse(savedCoords);
        setUserCoords({ lat: parsed.latitude, lng: parsed.longitude });
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery({
    id: propertyId,
    latitude: userCoords.lat,
    longitude: userCoords.lng,
  });

  useEffect(() => {
    if (isLoading || isError || !property || !mapContainerRef.current) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const lat = property.location.coordinates.latitude;
    const lng = property.location.coordinates.longitude;

    // Create map
    const map = L.map(mapContainerRef.current).setView([lat, lng], 14);
    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom marker icon
    const customIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #dc2828 0%, #f97316 100%);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-size: 16px;
            font-weight: bold;
          ">🏠</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    // Add marker
    L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(`
        <div style="text-align: center; padding: 8px;">
          <strong style="font-size: 14px;">${property.name}</strong>
          <br/>
          <span style="color: #666; font-size: 12px;">${property.location?.address || ""}</span>
          <br/>
          <strong style="color: #dc2828; font-size: 16px;">$${property.pricePerMonth}/mo</strong>
        </div>
      `);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [property, isError, isLoading]);

  if (isLoading) return <>Loading...</>;
  if (isError || !property) {
    return <>Property not Found</>;
  }

  return (
    <div className="py-16">
      <h3 className="text-xl font-semibold text-primary-800 dark:text-primary-100">
        Map and Location
      </h3>
      <div className="flex justify-between items-center text-sm text-primary-500 mt-2">
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <MapPin className="w-4 h-4 mr-1 text-gray-700 dark:text-gray-300" />
          Property Address:
          <span className="ml-2 font-semibold text-gray-700 dark:text-gray-200">
            {property.location?.address || "Address not available"}
          </span>
        </div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(
            property.location?.address || ""
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-between items-center hover:underline gap-2 text-primary-600 dark:text-primary-400"
        >
          <Compass className="w-5 h-5" />
          Get Directions
        </a>
      </div>
      <div
        className="relative mt-4 h-[300px] rounded-lg overflow-hidden shadow-lg"
        ref={mapContainerRef}
      />
    </div>
  );
};

export default PropertyLocation;
