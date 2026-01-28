"use client";
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import { Property } from "@/types/prismaTypes";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Next.js
const customIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// User location marker (blue)
const userLocationIcon = new Icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMzI4MmY2IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

interface MapContentProps {
  properties: Property[];
  coordinates?: [number, number];
}

// Component to handle map updates when coordinates change
const MapUpdater = ({ coordinates, properties }: { coordinates?: [number, number]; properties: Property[] }) => {
  const map = useMap();

  useEffect(() => {
    if (coordinates && coordinates[0] !== 0 && coordinates[1] !== 0) {
      // Center on user location
      const userLat = coordinates[1];
      const userLng = coordinates[0];
      
      if (properties.length > 0) {
        // Fit bounds to include user location and all properties
        const bounds = new LatLngBounds([[userLat, userLng]]);
        properties.forEach((property) => {
          bounds.extend([
            property.location.coordinates.latitude,
            property.location.coordinates.longitude,
          ]);
        });
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      } else {
        // Just center on user with default zoom
        map.setView([userLat, userLng], 12);
      }
    } else if (properties.length > 0) {
      // No user coordinates, fit to properties
      const bounds = new LatLngBounds(
        properties.map((p) => [
          p.location.coordinates.latitude,
          p.location.coordinates.longitude,
        ])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [coordinates, properties, map]);

  return null;
};

const MapContent = ({ properties, coordinates }: MapContentProps) => {
  // Default center: Use coordinates or default to US center
  const center: [number, number] = coordinates && coordinates[0] !== 0 && coordinates[1] !== 0
    ? [coordinates[1], coordinates[0]] // Leaflet uses [lat, lng] format
    : [39.8283, -98.5795]; // Center of USA

  return (
    <div className="basis-5/12 grow relative rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={coordinates ? 12 : 4}
        style={{ height: "100%", width: "100%" }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater coordinates={coordinates} properties={properties} />
        
        {/* User location marker */}
        {coordinates && coordinates[0] !== 0 && coordinates[1] !== 0 && (
          <Marker
            position={[coordinates[1], coordinates[0]]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="p-1 text-center">
                <span className="font-semibold text-blue-600">Your Location</span>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Property markers */}
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={[
              property.location.coordinates.latitude,
              property.location.coordinates.longitude,
            ]}
            icon={customIcon}
          >
            <Popup>
              <div className="p-1">
                <a
                  href={`/search/${property.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {property.name}
                </a>
                <p className="text-sm mt-1">
                  <span className="font-bold">${property.pricePerMonth}</span>
                  <span className="text-gray-500"> / month</span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapContent;
