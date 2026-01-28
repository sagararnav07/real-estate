"use client";
import React from "react";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery } from "@/state/api";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapContent = dynamic(() => import("./MapContent"), {
  ssr: false,
  loading: () => (
    <div className="basis-5/12 grow relative rounded-xl bg-gray-100 flex items-center justify-center">
      <p>Loading map...</p>
    </div>
  ),
});

const Map = () => {
  const filters = useAppSelector((state) => state.global.filters);
  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  if (isLoading) return <div className="basis-5/12 grow relative rounded-xl bg-gray-100 flex items-center justify-center">Loading...</div>;
  if (isError || !properties) return <div className="basis-5/12 grow relative rounded-xl bg-gray-100 flex items-center justify-center">Failed to fetch properties</div>;

  return (
    <MapContent 
      properties={properties} 
      coordinates={filters.coordinates} 
    />
  );
};

export default Map;
