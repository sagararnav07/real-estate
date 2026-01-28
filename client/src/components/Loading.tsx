"use client";

import React from "react";
import { motion } from "framer-motion";

const Loading = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo/spinner */}
        <div className="relative">
          {/* Outer rotating ring */}
          <motion.div
            className="w-16 h-16 rounded-full border-4 border-primary-200 dark:border-gray-700"
            style={{ borderTopColor: "transparent" }}
          />
          <motion.div
            className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-secondary-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner pulsing circle */}
          <motion.div
            className="absolute inset-3 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-full"
            animate={{ scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Loading text with dots animation */}
        <div className="flex items-center gap-1">
          <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
            Loading
          </span>
          <motion.span
            className="flex gap-1"
            initial="hidden"
            animate="visible"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 bg-secondary-500 rounded-full"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

export default Loading;
