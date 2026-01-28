"use client";

import { Bath, Bed, Heart, House, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState, memo, useCallback } from "react";
import { getImageUrl } from "@/lib/utils";
import { motion } from "framer-motion";

const Card = memo(({
  property,
  isFavorite,
  onFavoriteToggle,
  showFavoriteButton = true,
  propertyLink,
}: CardProps) => {
  const [imgSrc, setImgSrc] = useState(
    getImageUrl(property.photoUrls?.[0])
  );

  const handleImageError = useCallback(() => {
    setImgSrc("/placeholder.jpg");
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl w-full mb-5 transition-all duration-300"
    >
      <div className="relative group">
        <div className="w-full h-48 relative overflow-hidden">
          <Image
            src={imgSrc}
            alt={property.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={handleImageError}
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
          {property.isPetsAllowed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-black dark:text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg"
            >
              🐾 Pets Allowed
            </motion.span>
          )}
          {property.isParkingIncluded && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-black dark:text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg"
            >
              🚗 Parking
            </motion.span>
          )}
        </div>
        {showFavoriteButton && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-4 right-4 bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-600 rounded-full p-2.5 cursor-pointer shadow-lg transition-colors"
            onClick={onFavoriteToggle}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isFavorite ? "text-red-500 fill-red-500" : "text-gray-600 dark:text-gray-300"
              }`}
            />
          </motion.button>
        )}
        {/* Price badge on image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 bg-secondary-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg"
        >
          ${property.pricePerMonth.toFixed(0)}/mo
        </motion.div>
      </div>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-1 dark:text-white">
          {propertyLink ? (
            <Link
              href={propertyLink}
              className="hover:text-secondary-500 dark:hover:text-secondary-400 transition-colors"
              scroll={false}
            >
              {property.name}
            </Link>
          ) : (
            property.name
          )}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-3 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          {property?.location?.address}, {property?.location?.city}
        </p>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(property.averageRating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-600 dark:text-gray-400 ml-2 text-sm">
              ({property.numberOfReviews})
            </span>
          </div>
        </div>
        <hr className="dark:border-gray-700 my-3" />
        <div className="flex justify-between items-center gap-4 text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5 text-sm">
            <Bed className="w-4 h-4" />
            <span className="font-medium">{property.beds}</span> Beds
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <Bath className="w-4 h-4" />
            <span className="font-medium">{property.baths}</span> Baths
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <House className="w-4 h-4" />
            <span className="font-medium">{property.squareFeet}</span> sqft
          </span>
        </div>
      </div>
    </motion.div>
  );
});

Card.displayName = "Card";

export default Card;
