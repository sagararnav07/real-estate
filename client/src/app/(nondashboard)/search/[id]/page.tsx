"use client";

import { useGetAuthUserQuery, useGetPropertyQuery } from "@/state/api";
import { useParams, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import ImagePreviews from "./ImagePreviews";
import PropertyOverview from "./PropertyOverview";
import PropertyDetails from "./PropertyDetails";
import PropertyLocation from "./PropertyLocation";
import ContactWidget from "./ContactWidget";
import ApplicationModal from "./ApplicationModal";
import Loading from "@/components/Loading";
import { getImageUrl } from "@/lib/utils";

const SingleListing = () => {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const propertyId = Number(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat?: number; lng?: number }>({});
  const { data: authUser } = useGetAuthUserQuery();
  
  // Get user coordinates from URL params or localStorage
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    
    if (lat && lng) {
      setUserCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
    } else {
      // Try to get from localStorage or geolocation
      const savedCoords = localStorage.getItem("userCoordinates");
      if (savedCoords) {
        try {
          const parsed = JSON.parse(savedCoords);
          setUserCoords({ lat: parsed.latitude, lng: parsed.longitude });
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [searchParams]);
  
  const { data: property, isLoading } = useGetPropertyQuery({
    id: propertyId,
    latitude: userCoords.lat,
    longitude: userCoords.lng,
  });

  if (isLoading) return <Loading />;

  // Get property images or use placeholder
  const propertyImages = property?.photoUrls?.length 
    ? property.photoUrls.map(url => getImageUrl(url))
    : ["/singlelisting-2.jpg", "/singlelisting-3.jpg"];

  return (
    <div>
      <ImagePreviews
        images={propertyImages}
      />
      <div className="flex flex-col md:flex-row justify-center gap-10 mx-10 md:w-2/3 md:mx-auto mt-16 mb-8">
        <div className="order-2 md:order-1">
          <PropertyOverview propertyId={propertyId} />
          <PropertyDetails propertyId={propertyId} />
          <PropertyLocation propertyId={propertyId} />
        </div>

        <div className="order-1 md:order-2">
          <ContactWidget onOpenModal={() => setIsModalOpen(true)} />
        </div>
      </div>

      {authUser && (
        <ApplicationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          propertyId={propertyId}
        />
      )}
    </div>
  );
};

export default SingleListing;
