import * as React from "react"

import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl sm:rounded-3xl border transition-[transform,box-shadow,border-color,background-color] duration-200 ease-smooth hover:shadow-md hover:-translate-y-[1px] motion-reduce:hover:translate-y-0 motion-reduce:transition-none",
        variant === 'glass'
          ? "glass-card text-foreground"
          : "border-white/70 dark:border-white/10 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl text-card-foreground shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]",
        // When global theme is liquid-glass, cards automatically adopt liquid glass aesthetics
        "[[data-theme=liquid-glass]_&]:glass-card [.theme-liquid-glass_&]:glass-card",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xl sm:text-2xl font-black leading-tight tracking-tight text-slate-900 dark:text-white [[data-theme=liquid-glass]_&]:text-slate-950 dark:[[data-theme=liquid-glass]_&]:text-white",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed [[data-theme=liquid-glass]_&]:text-slate-700 dark:[[data-theme=liquid-glass]_&]:text-slate-200",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
