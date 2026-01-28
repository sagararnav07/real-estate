"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { AnimatedCounter } from "@/components/ui/animated-counter";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const DiscoverSection = () => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
      className="py-20 bg-white dark:bg-gray-800 transition-colors"
    >
      <div className="max-w-6xl xl:max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
        <motion.div variants={itemVariants} className="my-12 text-center">
          <motion.span
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-4"
          >
            How It Works
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Discover
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Find your Dream Rental Property Today!
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">
            Searching for your dream rental property has never been easier. With
            our user-friendly search feature, you can quickly find the perfect
            home that meets all your needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 text-center">
          {[
            {
              imageSrc: "/landing-icon-wand.png",
              title: "Search for Properties",
              description: "Browse through our extensive collection of rental properties in your desired location.",
              step: "01",
            },
            {
              imageSrc: "/landing-icon-calendar.png",
              title: "Book Your Rental",
              description: "Once you've found the perfect rental property, easily book it online with just a few clicks.",
              step: "02",
            },
            {
              imageSrc: "/landing-icon-heart.png",
              title: "Enjoy your New Home",
              description: "Move into your new rental property and start enjoying your dream home.",
              step: "03",
            },
          ].map((card, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <DiscoverCard {...card} />
            </motion.div>
          ))}
        </div>

        {/* Stats section */}
        <motion.div
          variants={itemVariants}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { value: 10000, suffix: "+", label: "Properties" },
            { value: 5000, suffix: "+", label: "Happy Customers" },
            { value: 500, suffix: "+", label: "Cities" },
            { value: 98, suffix: "%", label: "Satisfaction" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, type: "spring" }}
              className="p-6"
            >
              <div className="text-3xl md:text-4xl font-bold text-secondary-500 mb-2">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

const DiscoverCard = ({
  imageSrc,
  title,
  description,
  step,
}: {
  imageSrc: string;
  title: string;
  description: string;
  step: string;
}) => (
  <div className="relative px-6 py-10 bg-gradient-to-br from-primary-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg hover:shadow-2xl rounded-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
    {/* Step number */}
    <div className="absolute -top-4 -left-4 w-10 h-10 bg-secondary-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
      {step}
    </div>
    
    {/* Icon */}
    <motion.div
      whileHover={{ rotate: 10, scale: 1.1 }}
      className="bg-gradient-to-br from-primary-600 to-primary-800 p-4 rounded-2xl mb-6 h-16 w-16 mx-auto shadow-lg"
    >
      <Image
        src={imageSrc}
        width={40}
        height={40}
        className="w-full h-full object-contain"
        alt={title}
      />
    </motion.div>
    
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
  </div>
);

export default DiscoverSection;
