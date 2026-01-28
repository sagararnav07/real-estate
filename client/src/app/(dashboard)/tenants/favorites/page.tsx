"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetTenantQuery,
  useRemoveFavoritePropertyMutation,
} from "@/state/api";
import React, { useCallback } from "react";
import { Heart, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Favorites = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: tenant } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || "",
    {
      skip: !authUser?.cognitoInfo?.userId,
    }
  );
  const [removeFavorite] = useRemoveFavoritePropertyMutation();

  const {
    data: favoriteProperties,
    isLoading,
    error,
  } = useGetPropertiesQuery(
    { favoriteIds: tenant?.favorites?.map((fav: { id: number }) => fav.id) },
    { skip: !tenant?.favorites || tenant?.favorites.length === 0 }
  );

  const handleRemoveFavorite = useCallback(async (propertyId: number) => {
    if (!authUser) return;
    try {
      await removeFavorite({
        cognitoId: authUser.cognitoInfo.userId,
        propertyId,
      }).unwrap();
      toast.success("Removed from favorites");
    } catch {
      toast.error("Failed to remove from favorites");
    }
  }, [authUser, removeFavorite]);

  if (isLoading) return <Loading />;
  
  if (error) {
    return (
      <div className="dashboard-container">
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error loading favorites
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header
        title="Favorited Properties"
        subtitle="Browse and manage your saved property listings"
      />
      
      {(!favoriteProperties || favoriteProperties.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No favorites yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            Start exploring properties and tap the heart icon to save your favorites here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {favoriteProperties.length} saved {favoriteProperties.length === 1 ? "property" : "properties"}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteProperties?.map((property) => (
              <Card
                key={property.id}
                property={property}
                isFavorite={true}
                onFavoriteToggle={() => handleRemoveFavorite(property.id)}
                showFavoriteButton={true}
                propertyLink={`/search/${property.id}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Favorites;
