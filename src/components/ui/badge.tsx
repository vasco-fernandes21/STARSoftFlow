import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-500 text-emerald-50 shadow hover:bg-emerald-500/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        warning:
          "border-transparent bg-orange-500 text-orange-50 shadow hover:bg-orange-500/80",
        blue:
          "border-transparent bg-blue-500 text-blue-50 shadow hover:bg-blue-500/80",
        purple:
          "border-transparent bg-purple-500 text-purple-50 shadow hover:bg-purple-500/80",
        indigo:
          "border-transparent bg-indigo-500 text-indigo-50 shadow hover:bg-indigo-500/80",
        orange:
          "border-transparent bg-orange-500 text-orange-50 shadow hover:bg-orange-500/80",
        red:
          "border-transparent bg-red-500 text-red-50 shadow hover:bg-red-500/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
