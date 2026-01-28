"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, Search, Home } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const FeaturesSection = () => {
  const features = [
    {
      icon: Shield,
      imageSrc: "/landing-search3.png",
      title: "Trustworthy and Verified Listings",
      description: "Discover the best rental options with user reviews and ratings.",
      linkText: "Explore",
      linkHref: "/search",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Search,
      imageSrc: "/landing-search2.png",
      title: "Browse Rental Listings with Ease",
      description: "Get access to user reviews and ratings for a better understanding of rental options.",
      linkText: "Search",
      linkHref: "/search",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Home,
      imageSrc: "/landing-search1.png",
      title: "Simplify Your Rental Search",
      description: "Find trustworthy and verified rental listings to ensure a hassle-free experience.",
      linkText: "Discover",
      linkHref: "/search",
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      className="py-24 px-6 sm:px-8 lg:px-12 xl:px-16 bg-gray-50 dark:bg-gray-900 transition-colors"
    >
      <div className="max-w-4xl xl:max-w-6xl mx-auto">
        <motion.div variants={itemVariants} className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400 rounded-full text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Quickly find the home you want using our{" "}
            <span className="text-secondary-500">effective search filters!</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -10 }}
              className="group"
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const FeatureCard = ({
  icon: Icon,
  imageSrc,
  title,
  description,
  linkText,
  linkHref,
  color,
}: {
  icon: React.ElementType;
  imageSrc: string;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
  color: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
    {/* Icon badge */}
    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${color} mb-4`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    
    {/* Image */}
    <div className="relative h-40 mb-4 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
      <Image
        src={imageSrc}
        fill
        className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
        alt={title}
      />
    </div>
    
    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">{description}</p>
    
    <Link
      href={linkHref}
      className="inline-flex items-center gap-2 text-secondary-500 hover:text-secondary-600 font-medium group/link"
      scroll={false}
    >
      {linkText}
      <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
    </Link>
  </div>
);

export default FeaturesSection;
