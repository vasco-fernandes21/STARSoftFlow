"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const loaderVariants = cva(
  "relative flex items-center justify-center overflow-hidden",
  {
    variants: {
      variant: {
        default: "",
        skeleton: "animate-pulse bg-primary/5 rounded-md",
        spinner: "flex flex-col gap-3 items-center justify-center",
        pulse: "flex items-center justify-center"
      },
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8",
        md: "h-12 w-12",
        lg: "h-16 w-16",
        xl: "h-24 w-24",
        auto: "",
        fullWidth: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// Componente de Spinner
interface SpinnerProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  textClassName?: string;
}

function Spinner({ className, size = "md", text, textClassName }: SpinnerProps) {
  // Mapa de tamanhos para o spinner
  const sizeMap = {
    xs: "h-4 w-4",
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={cn("animate-spin text-primary", sizeMap[size], className)} />
      {text && <p className={cn("text-sm text-slate-600", textClassName)}>{text}</p>}
    </div>
  );
}

// Componente de Pulse Loader (dots)
interface PulseDotsProps {
  className?: string;
  color?: string;
}

function PulseDots({ className, color = "bg-primary" }: PulseDotsProps) {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full",
            color,
            i === 0 && "animate-pulse-fast",
            i === 1 && "animate-pulse-medium",
            i === 2 && "animate-pulse-slow"
          )}
        />
      ))}
    </div>
  );
}

// Componente genérico de SkeletonCard
interface SkeletonCardProps {
  className?: string;
  header?: boolean;
  headerHeight?: string;
  rows?: number;
  rowHeight?: string;
  gap?: string;
}

function SkeletonCard({
  className,
  header = true,
  headerHeight = "h-6",
  rows = 3,
  rowHeight = "h-4",
  gap = "gap-3",
}: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      {header && <div className={cn("mb-4 animate-pulse rounded bg-primary/5", headerHeight, "w-3/4")} />}
      <div className={cn("space-y-2", gap)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn("animate-pulse rounded bg-primary/5", rowHeight, i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-4/5" : "w-3/5")}
          />
        ))}
      </div>
    </div>
  );
}

// Composição de tabela com skeleton loading
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  headerHeight?: string;
  rowHeight?: string;
  className?: string;
}

function SkeletonTable({
  rows = 5,
  columns = 4,
  headerHeight = "h-8",
  rowHeight = "h-10",
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("w-full rounded-lg border", className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex justify-between">
          <div className="animate-pulse rounded bg-primary/5 h-6 w-32" />
          <div className="animate-pulse rounded bg-primary/5 h-6 w-24" />
        </div>
      </div>

      {/* Table Header */}
      <div className="border-b px-4 py-3 grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={cn("animate-pulse rounded bg-primary/5", headerHeight, "w-4/5")} />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, j) => (
              <div
                key={j}
                className={cn(
                  "animate-pulse rounded bg-primary/5",
                  rowHeight,
                  j === 0 ? "w-4/5" : "w-3/5"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente principal
export interface LoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loaderVariants> {
  text?: string;
  fullPage?: boolean;
}

export function Loader({
  className,
  variant,
  size,
  text,
  fullPage = false,
  ...props
}: LoaderProps) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (fullPage) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <Wrapper>
      <div className={cn(loaderVariants({ variant, size, className }))} {...props}>
        {variant === "spinner" && <Spinner text={text} />}
        {variant === "pulse" && (
          <div className="flex flex-col items-center justify-center gap-2">
            <PulseDots />
            {text && <p className="text-sm text-slate-600">{text}</p>}
          </div>
        )}
        {(variant === "default" || variant === "skeleton") && <div />}
      </div>
    </Wrapper>
  );
}

Loader.Spinner = Spinner;
Loader.PulseDots = PulseDots;
Loader.SkeletonCard = SkeletonCard;
Loader.SkeletonTable = SkeletonTable;

export { Spinner, PulseDots, SkeletonCard, SkeletonTable }; 