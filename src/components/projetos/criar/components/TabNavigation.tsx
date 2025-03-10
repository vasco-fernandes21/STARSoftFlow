import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  showBackButton?: boolean;
  showNextButton?: boolean;
  backLabel?: string;
  nextLabel?: string;
  nextIcon?: ReactNode;
  backIcon?: ReactNode;
  isLastStep?: boolean;
  onSubmit?: () => void;
  submitLabel?: string;
  submitIcon?: ReactNode;
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  isNextDisabled?: boolean;
  className?: string;
}

export function TabNavigation({
  onBack,
  onNext,
  showBackButton = true,
  showNextButton = true,
  backLabel = "Anterior",
  nextLabel = "Próximo",
  nextIcon = <ArrowRight className="ml-2 h-4 w-4" />,
  backIcon = <ArrowLeft className="mr-2 h-4 w-4" />,
  isLastStep = false,
  onSubmit,
  submitLabel = "Finalizar",
  submitIcon = <Save className="mr-2 h-4 w-4" />,
  isSubmitting = false,
  isSubmitDisabled = false,
  isNextDisabled = false,
  className
}: TabNavigationProps) {
  return (
    <div className={cn("flex justify-between items-center mt-8 pt-6 border-t border-azul/10", className)}>
      {showBackButton && (
        <Button
          variant="outline"
          onClick={onBack}
          className="shadow-sm border-azul/20 text-azul/80 hover:bg-azul/5 hover:text-azul transition-all duration-200 rounded-xl px-5 py-2 font-medium"
        >
          {backIcon}
          {backLabel}
        </Button>
      )}
      
      {!showBackButton && <div />} {/* Espaçador quando não há botão de voltar */}
      
      {isLastStep ? (
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || isSubmitDisabled}
          className={`${!isSubmitDisabled 
            ? 'bg-azul hover:bg-azul/90 shadow-md hover:shadow-lg'
            : 'bg-gray-300 text-gray-500'} 
            text-white rounded-xl px-6 py-2 font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100`}
        >
          {submitIcon}
          {isSubmitting ? (
            <div className="flex items-center">
              <span className="mr-2">A processar</span>
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            </div>
          ) : (
            submitLabel
          )}
        </Button>
      ) : showNextButton && (
        <Button
          onClick={onNext}
          disabled={isNextDisabled}
          className={`${!isNextDisabled 
            ? 'bg-azul hover:bg-azul/90 shadow-md hover:shadow-lg' 
            : 'bg-gray-300 text-gray-500'} 
            text-white rounded-xl px-6 py-2 font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100`}
        >
          {nextLabel}
          {nextIcon}
        </Button>
      )}
    </div>
  );
} 