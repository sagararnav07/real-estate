"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
}

export function GradientText({
  children,
  className,
  colors = ["#dc2828", "#f97316", "#dc2828"],
  animationSpeed = 3,
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
    backgroundSize: "200% auto",
  };

  return (
    <motion.span
      className={cn(
        "inline-block bg-clip-text text-transparent font-bold",
        className
      )}
      style={gradientStyle}
      animate={{
        backgroundPosition: ["0% center", "200% center"],
      }}
      transition={{
        duration: animationSpeed,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}

// Shimmer text effect
export function ShimmerText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block relative",
        "bg-gradient-to-r from-primary-700 via-secondary-500 to-primary-700 bg-clip-text text-transparent",
        "bg-[length:200%_100%] animate-shimmer",
        className
      )}
    >
      {children}
    </span>
  );
}

// Typing effect
interface TypingEffectProps {
  text: string;
  className?: string;
  speed?: number;
}

export function TypingEffect({ text, className, speed = 0.05 }: TypingEffectProps) {
  return (
    <motion.span className={className}>
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * speed }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Word by word reveal
interface WordRevealProps {
  text: string;
  className?: string;
  delay?: number;
}

export function WordReveal({ text, className, delay = 0.1 }: WordRevealProps) {
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="inline-block mr-2"
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: index * delay,
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
