"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetAuthUserQuery, useGetManagerPropertiesQuery } from "@/state/api";
import React from "react";
import { Building2, AlertCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const Properties = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: managerProperties,
    isLoading,
    error,
  } = useGetManagerPropertiesQuery(authUser?.cognitoInfo?.userId || "", {
    skip: !authUser?.cognitoInfo?.userId,
  });

  if (isLoading) return <Loading />;
  
  if (error) {
    return (
      <div className="dashboard-container">
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error loading properties
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
        title="My Properties"
        subtitle="View and manage your property listings"
      />
      
      {(!managerProperties || managerProperties.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No properties yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            Start by adding your first property listing to begin managing rentals.
          </p>
          <Link href="/managers/newproperty">
            <Button className="bg-primary-700 text-white hover:bg-primary-800">
              <Plus className="w-4 h-4 mr-2" />
              Add New Property
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {managerProperties.length} {managerProperties.length === 1 ? "property" : "properties"}
            </span>
            <Link href="/managers/newproperty">
              <Button size="sm" className="bg-primary-700 text-white hover:bg-primary-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {managerProperties?.map((property) => (
              <Card
                key={property.id}
                property={property}
                isFavorite={false}
                onFavoriteToggle={() => {}}
                showFavoriteButton={false}
                propertyLink={`/managers/properties/${property.id}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Properties;
