"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/state/redux";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import FiltersBar from "./FiltersBar";
import FiltersFull from "./FiltersFull";
import { cleanParams } from "@/lib/utils";
import { setFilters } from "@/state";
import Map from "./Map";
import Listings from "./Listings";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Loader2, Navigation, CheckCircle } from "lucide-react";

// Reverse geocode coordinates to get city/area name
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          "User-Agent": "RealEstateApp/1.0",
        },
      }
    );
    const data = await response.json();

    // Try to get the most specific location name
    const address = data.address;
    const locationName =
      address?.suburb ||
      address?.neighbourhood ||
      address?.city ||
      address?.town ||
      address?.village ||
      address?.municipality ||
      address?.county ||
      address?.state_district ||
      address?.state ||
      "your area";

    // Also include city/state for context if we have a suburb
    let fullLocation = locationName;
    if (address?.suburb || address?.neighbourhood) {
      const city = address?.city || address?.town || address?.village;
      if (city && city !== locationName) {
        fullLocation = `${locationName}, ${city}`;
      }
    }

    return fullLocation;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return "your area";
  }
};

const SearchPage = () => {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen
  );

  // Location detection states
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasAskedPermission, setHasAskedPermission] = useState(false);

  // Check if there are any search params (user came from a search)
  const hasSearchParams = searchParams.toString().length > 0;

  // Detect user's location
  const detectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Get the location name
        const locationName = await reverseGeocode(latitude, longitude);
        setDetectedLocation(locationName);

        // Update filters with detected coordinates
        dispatch(
          setFilters({
            location: locationName,
            coordinates: [longitude, latitude],
          })
        );

        setIsDetectingLocation(false);
        setShowLocationPrompt(false);

        // Save that user allowed location and store coordinates
        localStorage.setItem("locationPermission", "granted");
        localStorage.setItem("userCoordinates", JSON.stringify({ latitude, longitude }));
      },
      (error) => {
        console.error("Location error:", error);
        let errorMessage = "Unable to detect your location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied";
            localStorage.setItem("locationPermission", "denied");
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }

        setLocationError(errorMessage);
        setIsDetectingLocation(false);
        setShowLocationPrompt(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, [dispatch]);

  // Handle location prompt dismissal
  const dismissLocationPrompt = () => {
    setShowLocationPrompt(false);
    localStorage.setItem("locationPermission", "dismissed");
  };

  useEffect(() => {
    const initialFilters = Array.from(searchParams.entries()).reduce(
      (acc: any, [key, value]) => {
        if (key === "priceRange" || key === "squareFeet") {
          acc[key] = value.split(",").map((v) => (v === "" ? null : Number(v)));
        } else if (key === "coordinates") {
          acc[key] = value.split(",").map(Number);
        } else if (key === "lat" || key === "lng") {
          // Handle legacy lat/lng params - convert to coordinates
          if (!acc.coordinates) {
            acc.coordinates = [0, 0];
          }
          if (key === "lat") {
            acc.coordinates[1] = Number(value);
          } else {
            acc.coordinates[0] = Number(value);
          }
        } else {
          acc[key] = value === "any" ? null : value;
        }

        return acc;
      },
      {}
    );

    const cleanedFilters = cleanParams(initialFilters);
    dispatch(setFilters(cleanedFilters));

    // Check if we should ask for location permission
    // Only ask if user didn't come from a search and hasn't been asked before
    if (!hasSearchParams && !hasAskedPermission) {
      const savedPermission = localStorage.getItem("locationPermission");

      if (savedPermission === "granted") {
        // Auto-detect if previously granted
        detectLocation();
      } else if (savedPermission !== "denied" && savedPermission !== "dismissed") {
        // Show prompt if never asked
        setShowLocationPrompt(true);
      }
      setHasAskedPermission(true);
    }
  }, [hasSearchParams, hasAskedPermission, detectLocation, dispatch, searchParams]);

  return (
    <div
      className="w-full mx-auto px-5 flex flex-col relative"
      style={{
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      }}
    >
      {/* Location Permission Modal */}
      <AnimatePresence>
        {showLocationPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden"
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

              <button
                onClick={dismissLocationPrompt}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4"
                >
                  <MapPin className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Find Properties Near You
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Allow location access to discover rental properties in your
                  area automatically.
                </p>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={dismissLocationPrompt}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Not Now
                  </button>
                  <button
                    onClick={detectLocation}
                    disabled={isDetectingLocation}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isDetectingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        Use My Location
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Detection Status Banner */}
      <AnimatePresence>
        {isDetectingLocation && !showLocationPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Detecting your location...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detected Location Banner */}
      <AnimatePresence>
        {detectedLocation && !isDetectingLocation && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Showing properties in {detectedLocation}
            </span>
            <button
              onClick={() => setDetectedLocation(null)}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Error Banner */}
      <AnimatePresence>
        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <span className="text-sm font-medium">{locationError}</span>
            <button
              onClick={() => setLocationError(null)}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <FiltersBar />
      <div className="flex justify-between flex-1 overflow-hidden gap-3 mb-5">
        <div
          className={`h-full overflow-auto transition-all duration-300 ease-in-out ${
            isFiltersFullOpen
              ? "w-3/12 opacity-100 visible"
              : "w-0 opacity-0 invisible"
          }`}
        >
          <FiltersFull />
        </div>
        <Map />
        <div className="basis-4/12 overflow-y-auto">
          <Listings />
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
