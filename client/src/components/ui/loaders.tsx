"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Pulse loader
export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-3 h-3 bg-secondary-500 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

// Spinning loader with gradient
export function GradientSpinner({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, transparent, #dc2828)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div
        className="absolute bg-white dark:bg-gray-900 rounded-full"
        style={{
          inset: size * 0.15,
        }}
      />
    </div>
  );
}

// Skeleton loader with shimmer effect
export function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-200 dark:bg-gray-800 rounded-lg",
        className
      )}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
        }}
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Property card skeleton
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg">
      <SkeletonShimmer className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <SkeletonShimmer className="h-6 w-3/4" />
        <SkeletonShimmer className="h-4 w-1/2" />
        <div className="flex justify-between">
          <SkeletonShimmer className="h-4 w-20" />
          <SkeletonShimmer className="h-4 w-24" />
        </div>
        <SkeletonShimmer className="h-px w-full" />
        <div className="flex justify-between pt-2">
          <SkeletonShimmer className="h-4 w-16" />
          <SkeletonShimmer className="h-4 w-16" />
          <SkeletonShimmer className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

// Page loading overlay
export function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <GradientSpinner size={48} />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 dark:text-gray-400 font-medium"
        >
          Loading...
        </motion.p>
      </div>
    </motion.div>
  );
}
