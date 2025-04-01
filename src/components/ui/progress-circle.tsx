import React from "react";
import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  strokeWidth?: number;
  className?: string;
  valueClassName?: string;
}

export function ProgressCircle({
  value,
  size = "md",
  showValue = false,
  strokeWidth = 4,
  className,
  valueClassName,
}: ProgressCircleProps) {
  // Assegurar que o valor está entre 0 e 100
  const safeValue = Math.max(0, Math.min(100, value));

  // Calcular tamanho do círculo baseado no tamanho escolhido
  const sizes = {
    sm: 40,
    md: 64,
    lg: 80,
  };

  const circleSize = sizes[size];
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeValue / 100) * circumference;

  // Determinar a cor baseada no valor
  const getColorClass = () => {
    if (safeValue < 25) return "stroke-red-500";
    if (safeValue < 50) return "stroke-orange-500";
    if (safeValue < 75) return "stroke-azul";
    return "stroke-green-500";
  };

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: circleSize, height: circleSize }}
    >
      {/* Círculo de fundo */}
      <svg
        className="absolute"
        width={circleSize}
        height={circleSize}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
      >
        <circle
          className="stroke-azul/10"
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
      </svg>

      {/* Círculo de progresso */}
      <svg
        className="absolute -rotate-90 transform"
        width={circleSize}
        height={circleSize}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
      >
        <circle
          className={getColorClass()}
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>

      {/* Texto de porcentagem */}
      {showValue && (
        <div className={cn("flex items-center justify-center text-xs font-medium", valueClassName)}>
          {safeValue}%
        </div>
      )}
    </div>
  );
}
