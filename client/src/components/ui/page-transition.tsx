"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Fade transition
export function FadeTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide transition
export function SlideTransition({
  children,
  className,
  direction = "up",
}: PageTransitionProps & { direction?: "up" | "down" | "left" | "right" }) {
  const variants = {
    up: { initial: { y: 20 }, animate: { y: 0 }, exit: { y: -20 } },
    down: { initial: { y: -20 }, animate: { y: 0 }, exit: { y: 20 } },
    left: { initial: { x: 20 }, animate: { x: 0 }, exit: { x: -20 } },
    right: { initial: { x: -20 }, animate: { x: 0 }, exit: { x: 20 } },
  };

  return (
    <motion.div
      initial={{ ...variants[direction].initial, opacity: 0 }}
      animate={{ ...variants[direction].animate, opacity: 1 }}
      exit={{ ...variants[direction].exit, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale transition
export function ScaleTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// List item animation wrapper
export function AnimatedListItem({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
