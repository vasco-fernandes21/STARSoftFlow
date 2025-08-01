"use client";

import * as React from "react";
import { format, getYear, getMonth, setMonth, setYear } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { pt } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  error = false,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  // Estado para controlar o mês e ano atual do calendário
  const [calendarDate, setCalendarDate] = React.useState<Date>(value || new Date());
  const [position, setPosition] = React.useState<"top" | "bottom">("bottom");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Definimos o minDate dentro do componente
  const effectiveMinDate = minDate;

  // Função para calcular a posição ideal do calendário
  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < 400 && spaceAbove > spaceBelow) {
      setPosition("top");
    } else {
      setPosition("bottom");
    }
  }, []);

  // Atualiza a posição quando o popover abre
  const handleOpenChange = (open: boolean) => {
    if (open) {
      updatePosition();
      // Quando o popover abre, atualiza o calendário para a data selecionada ou a data atual
      setCalendarDate(value || new Date());
    }
  };

  // Atualiza a posição quando a janela é redimensionada
  React.useEffect(() => {
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updatePosition]);

  // Função para lidar com a seleção de data de forma segura
  const handleDateSelect = (date?: Date) => {
    // Verificar se a data está dentro dos limites permitidos
    if (date) {
      // Não permitir datas anteriores ao minDate
      if (effectiveMinDate && date < effectiveMinDate) {
        return;
      }

      // Não permitir datas posteriores ao maxDate
      if (maxDate && date > maxDate) {
        return;
      }
      
      // Preservar a data selecionada exatamente como foi escolhida
      // para evitar problemas de fuso horário
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Usar meio-dia UTC para evitar problemas de fuso horário
      const adjustedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      
      if (onChange) {
        onChange(adjustedDate);
      }
      
      // Atualizar o estado do calendário para a data selecionada
      setCalendarDate(adjustedDate);
    } else {
      if (onChange) {
        onChange(undefined);
      }
    }
  };

  return (
    <div className="relative w-full">
      <Popover onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            className={cn(
              "w-full justify-start rounded-xl border-gray-200 bg-white/70 text-left font-normal shadow-sm backdrop-blur-sm transition-all duration-300 ease-in-out hover:bg-white/80",
              "hover:shadow-md focus:ring-2 focus:ring-azul/20",
              !value && "text-gray-500",
              error && "border-red-300 focus:ring-red-500/20",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
            {value ? (
              <span className="text-gray-700">
                {format(value, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
              </span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] rounded-xl border-white/20 bg-white/95 p-0 shadow-xl backdrop-blur-md"
          align="center"
          side={position}
          sideOffset={5}
          alignOffset={0}
          avoidCollisions={false}
          sticky="always"
          hideWhenDetached={false}
          style={{
            zIndex: 50,
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
          }}
        >
          <div className="flex flex-col items-center p-2">
            <div className="mb-2 w-full px-1">
              <div className="text-center text-sm font-medium text-azul">Selecione uma data</div>

              {/* Seletores de Ano e Mês */}
              <div className="mt-2 flex w-full gap-2">
                <div className="flex-1">
                  <Select
                    value={getYear(calendarDate).toString()}
                    onValueChange={(year) => {
                      setCalendarDate(setYear(calendarDate, parseInt(year)));
                    }}
                  >
                    <SelectTrigger className="h-8 rounded-lg border-azul/20 bg-white/80 text-xs text-azul transition-colors hover:bg-azul/10">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 20 }, (_, i) => {
                        const year = new Date().getFullYear() - 10 + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Select
                    value={getMonth(calendarDate).toString()}
                    onValueChange={(month) => {
                      setCalendarDate(setMonth(calendarDate, parseInt(month)));
                    }}
                  >
                    <SelectTrigger className="h-8 rounded-lg border-azul/20 bg-white/80 text-xs text-azul transition-colors hover:bg-azul/10">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthName = format(new Date(2000, i, 1), "MMMM", { locale: pt });
                        return (
                          <SelectItem key={i} value={i.toString()}>
                            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              month={calendarDate}
              onMonthChange={setCalendarDate}
              initialFocus
              locale={pt}
              disabled={(date) => {
                if (effectiveMinDate && date < effectiveMinDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              className="w-full p-0"
              formatters={{
                formatCaption: (date, _options) => {
                  return format(date, "MMMM yyyy", { locale: pt });
                },
              }}
              classNames={{
                months: "flex flex-col space-y-2 w-full",
                month: "space-y-2 w-full",
                caption: "flex justify-center relative items-center h-10 w-full",
                caption_label:
                  "text-sm font-medium capitalize text-customBlue absolute left-1/2 -translate-x-1/2",
                nav: "flex items-center justify-between space-x-1 w-full px-2",
                nav_button:
                  "h-7 w-7 bg-white/80 hover:bg-azul/10 rounded-full flex items-center justify-center text-azul hover:text-azul transition-colors",
                nav_button_previous: "",
                nav_button_next: "",
                table: "w-full border-collapse space-y-1",
                head_row: "flex justify-between w-full px-2",
                head_cell:
                  "text-azul/80 font-medium text-[0.8rem] w-9 flex items-center justify-center",
                row: "flex justify-between w-full mt-1 px-2",
                cell: "relative w-9 h-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-azul/5",
                day: "w-9 h-9 p-0 flex items-center justify-center rounded-md aria-selected:opacity-100 hover:bg-azul/10 hover:text-azul transition-colors",
                day_selected:
                  "bg-azul text-white hover:bg-azul hover:text-white focus:bg-azul focus:text-white shadow-md",
                day_today: "border-2 border-azul/20 text-gray-900",
                day_outside:
                  "text-gray-400 opacity-50 aria-selected:bg-gray-100/50 aria-selected:text-gray-500 aria-selected:opacity-30",
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
  );
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
  );
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
  );
}
