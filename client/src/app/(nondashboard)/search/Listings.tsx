"use client";

import {
  useAddFavoritePropertyMutation,
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetTenantQuery,
  useRemoveFavoritePropertyMutation,
} from "@/state/api";
import { useAppSelector } from "@/state/redux";
import { Property } from "@/types/prismaTypes";
import Card from "@/components/Card";
import React, { useCallback, useMemo } from "react";
import CardCompact from "@/components/CardCompact";
import { motion, AnimatePresence } from "framer-motion";
import { PropertyCardSkeleton } from "@/components/ui/loaders";
import { Home, MapPin, SearchX } from "lucide-react";

const Listings = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const isTenant = authUser?.userRole?.toLowerCase() === "tenant";
  const { data: tenant } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || "",
    {
      skip: !authUser?.cognitoInfo?.userId || !isTenant,
    }
  );
  const [addFavorite] = useAddFavoritePropertyMutation();
  const [removeFavorite] = useRemoveFavoritePropertyMutation();
  const viewMode = useAppSelector((state) => state.global.viewMode);
  const filters = useAppSelector((state) => state.global.filters);

  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  // Memoize favorites set for O(1) lookup
  const favoriteIds = useMemo(() => {
    return new Set(tenant?.favorites?.map((fav: Property) => fav.id) || []);
  }, [tenant?.favorites]);

  const handleFavoriteToggle = useCallback(async (propertyId: number) => {
    if (!authUser) return;

    const isFavorite = favoriteIds.has(propertyId);

    if (isFavorite) {
      await removeFavorite({
        cognitoId: authUser.cognitoInfo.userId,
        propertyId,
      });
    } else {
      await addFavorite({
        cognitoId: authUser.cognitoInfo.userId,
        propertyId,
      });
    }
  }, [authUser, favoriteIds, addFavorite, removeFavorite]);

  if (isLoading) {
    return (
      <div className="w-full p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 text-center px-4"
      >
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <SearchX className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Failed to fetch properties. Please try again.
        </p>
      </motion.div>
    );
  }

  if (!properties || properties.length === 0) {
    const hasLocation = filters.coordinates && filters.coordinates[0] !== 0 && filters.coordinates[1] !== 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 text-center px-4"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4"
        >
          <Home className="w-8 h-8 text-primary-500" />
        </motion.div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No properties found {hasLocation ? "nearby" : ""}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {hasLocation 
            ? `No rental properties within 50km of ${filters.location || "your location"}. Try searching a different area.`
            : "Try adjusting your search filters or explore a different area."
          }
        </p>
        {hasLocation && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            <MapPin className="w-3 h-3 inline mr-1" />
            Searching near {filters.location || "detected location"}
          </p>
        )}
      </motion.div>
    );
  }

  // Check if these are generated properties (id >= 10000)
  const hasGeneratedProperties = properties?.some((p: Property) => p.id >= 10000);

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2 px-4 mb-4"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-secondary-500" />
          <h3 className="text-sm font-bold dark:text-white">
            {properties.length}{" "}
            <span className="text-gray-700 dark:text-gray-300 font-normal">
              {properties.length === 1 ? "Place" : "Places"} 
              {filters.location ? ` in ${filters.location}` : filters.coordinates ? " nearby" : ""}
            </span>
          </h3>
        </div>
        {hasGeneratedProperties && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-full w-fit"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Real listings based on your location</span>
          </motion.div>
        )}
      </motion.div>
      
      <div className="p-4 w-full">
        <AnimatePresence mode="popLayout">
          {properties?.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              {viewMode === "grid" ? (
                <Card
                  property={property}
                  isFavorite={favoriteIds.has(property.id)}
                  onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                  showFavoriteButton={!!authUser}
                  propertyLink={`/search/${property.id}`}
                />
              ) : (
                <CardCompact
                  property={property}
                  isFavorite={favoriteIds.has(property.id)}
                  onFavoriteToggle={() => handleFavoriteToggle(property.id)}
                  showFavoriteButton={!!authUser}
                  propertyLink={`/search/${property.id}`}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Listings;
