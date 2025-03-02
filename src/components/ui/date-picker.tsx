"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { pt } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onChange?: (date?: Date) => void
  placeholder?: string
  error?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  error = false,
  className
}: DatePickerProps) {
  const [position, setPosition] = React.useState<"top" | "bottom">("bottom")
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Função para calcular a posição ideal do calendário
  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    // Se o espaço abaixo for menor que 400px (altura aproximada do calendário)
    // e houver mais espaço acima, posiciona acima do input
    if (spaceBelow < 400 && spaceAbove > spaceBelow) {
      setPosition("top")
    } else {
      setPosition("bottom")
    }
  }, [])

  // Atualiza a posição quando o popover abre
  const handleOpenChange = (open: boolean) => {
    if (open) {
      updatePosition()
    }
  }

  // Atualiza a posição quando a janela é redimensionada
  React.useEffect(() => {
    const handleResize = () => updatePosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updatePosition])

  return (
    <div className="relative w-full">
      <Popover onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal rounded-xl border-gray-200 bg-white/70 shadow-sm backdrop-blur-sm hover:bg-white/80 transition-all duration-300 ease-in-out",
              "focus:ring-2 focus:ring-azul/20 hover:shadow-md",
              !value && "text-gray-500",
              error && "border-red-300 focus:ring-red-500/20",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
            {value ? (
              <span className="text-gray-700">{format(value, "dd 'de' MMMM 'de' yyyy", { locale: pt })}</span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[320px] p-0 bg-white/95 backdrop-blur-md shadow-xl rounded-xl border-white/20" 
          align="start"
          side={position}
          sideOffset={5}
          alignOffset={0}
          avoidCollisions={false}
          sticky="always"
          hideWhenDetached={false}
          style={{ 
            zIndex: 50,
            maxHeight: "calc(100vh - 100px)", // Limita a altura máxima
            overflowY: "auto" // Adiciona scroll se necessário
          }}
        >
          <div className="p-3">
            <div className="mb-3 px-1">
              <div className="text-azul font-medium text-sm">
                Selecione uma data
              </div>
            </div>
            <Calendar
              mode="single"
              selected={value}
              onSelect={onChange}
              initialFocus
              locale={pt}
              className="p-0"
              classNames={{
                months: "flex flex-col space-y-4",
                month: "space-y-4",
                caption: "flex justify-center relative items-center px-2",
                caption_label: "text-sm font-semibold text-gray-900",
                nav: "flex items-center space-x-1",
                nav_button: "h-7 w-7 bg-white/80 hover:bg-azul/10 rounded-full flex items-center justify-center text-azul hover:text-azul transition-colors",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex w-full mt-2",
                head_cell: "text-azul/80 font-medium text-xs w-9 h-9 flex items-center justify-center rounded-md",
                row: "flex w-full mt-1",
                cell: "relative w-9 h-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-azul/5 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                day: "w-9 h-9 p-0 flex items-center justify-center rounded-md aria-selected:opacity-100 hover:bg-azul/10 hover:text-azul transition-colors",
                day_selected: "bg-azul text-white hover:bg-azul hover:text-white focus:bg-azul focus:text-white shadow-md",
                day_today: "border-2 border-azul/20 text-gray-900",
                day_outside: "text-gray-400 opacity-50 aria-selected:bg-gray-100/50 aria-selected:text-gray-500 aria-selected:opacity-30",
                day_disabled: "text-gray-400 opacity-50",
                day_range_middle: "aria-selected:bg-azul/20 aria-selected:text-gray-900",
                day_hidden: "invisible",
              }}
              components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}