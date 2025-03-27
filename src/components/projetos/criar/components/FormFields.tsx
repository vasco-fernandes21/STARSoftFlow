import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Props base para todos os campos
interface BaseFieldProps {
  label: string;
  required?: boolean;
  tooltip?: string;
  helpText?: string;
  className?: string;
  id?: string;
  icon?: ReactNode;
  _disabled?: boolean;
}

// FormLabel simplificado
interface FormLabelProps extends React.ComponentProps<typeof Label> {
  required?: boolean;
  tooltip?: string;
}

function FormLabel({ children, required, tooltip, ...props }: FormLabelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label {...props} className="text-azul/80 font-medium">
        {children} {required && <span className="text-red-500">*</span>}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger tabIndex={-1}>
              <HelpCircle className="h-3.5 w-3.5 text-azul/40 hover:text-azul/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// TextField atualizado
interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
  onBlur?: () => void;
  _disabled?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  helpText,
  required = false,
  className = "",
  id,
  icon,
  tooltip,
  _disabled,
  onBlur
}: TextFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        {icon}
        <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
          {label}
        </FormLabel>
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-azul/20 bg-white/90 focus:border-azul focus:ring-1 focus:ring-azul/30 rounded-lg shadow-sm transition-all duration-200 hover:border-azul/30"
        required={required}
        disabled={_disabled}
        onBlur={onBlur}
      />
      {helpText && (
        <p className={cn(
          "text-xs mt-1",
          helpText.includes("deve ter") || helpText.includes("obrigatório") 
            ? "text-red-500" 
            : "text-azul/60"
        )}>
          {helpText}
        </p>
      )}
    </div>
  );
}

// DecimalField atualizado
interface DecimalFieldProps extends BaseFieldProps {
  value: number | null;  // Alterado para permitir null
  onChange: (value: number | null) => void;  // Alterado para permitir null
  prefix?: ReactNode;
  suffix?: ReactNode;
  step?: number;
  min?: number;
  max?: number;
}

export function DecimalField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 0.01,
  min,
  max,
  required = false,
  tooltip,
  helpText,
  className = "",
  id,
  _disabled
}: DecimalFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {typeof prefix === "string" ? <span className="text-azul/50">{prefix}</span> : prefix}
          </div>
        )}
        <Input
          id={id}
          type="number"
          value={value ?? ""}  // Usa string vazia quando for null
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              onChange(null);
            } else {
              const newValue = parseFloat(val);
              onChange(isNaN(newValue) ? null : newValue);
            }
          }}
          className={cn(
            "border-azul/20 bg-white/90 focus:border-azul focus:ring-1 focus:ring-azul/30 rounded-lg shadow-sm transition-all duration-200 hover:border-azul/30",
            prefix && "pl-8",
            suffix && "pr-8"
          )}
          step={step}
          min={min}
          max={max}
          required={required}
          disabled={_disabled}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {typeof suffix === "string" ? <span className="text-azul/50">{suffix}</span> : suffix}
          </div>
        )}
      </div>
      {helpText && <p className="text-xs text-azul/60 mt-1">{helpText}</p>}
    </div>
  );
}

// MoneyField atualizado
export function MoneyField(props: Omit<DecimalFieldProps, "prefix" | "step" | "min" | "max">) {
  return (
    <DecimalField
      {...props}
      prefix="€"
      step={0.01}
      min={0}
      max={1000000}
    />
  );
}

// PercentageField atualizado
export function PercentageField(props: Omit<DecimalFieldProps, "suffix" | "step" | "min" | "max">) {
  return (
    <DecimalField
      {...props}
      suffix="%"
      step={0.1}
      min={0}
      max={100}
    />
  );
}

// TextareaField atualizado
interface TextareaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 4,
  helpText,
  required = false,
  className = "",
  id,
  icon,
  tooltip,
  _disabled
}: TextareaFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        {icon}
        <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
          {label}
        </FormLabel>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-azul/20 bg-white/90 focus:border-azul focus:ring-1 focus:ring-azul/30 min-h-[100px] rounded-lg shadow-sm transition-all duration-200 hover:border-azul/30"
        required={required}
        rows={rows}
        disabled={_disabled}
      />
      {helpText && <p className="text-xs text-azul/60 mt-1">{helpText}</p>}
    </div>
  );
}

// DateField atualizado para usar Date | undefined
interface DateFieldProps extends BaseFieldProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function DateField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  required = false,
  tooltip,
  helpText,
  className = "",
  id,
  _disabled
}: DateFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <DatePicker
        value={value ?? undefined}
        onChange={(date) => onChange(date ?? null)}
        minDate={minDate}
        maxDate={maxDate}
      />
      {helpText && <p className="text-xs text-azul/60 mt-1">{helpText}</p>}
    </div>
  );
}

// SelectField atualizado
interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione uma opção",
  helpText,
  required = false,
  className = "",
  id,
  tooltip,
  _disabled
}: SelectFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={_disabled}
      >
        <SelectTrigger id={id} className="border-azul/20 focus:ring-1 focus:ring-azul/30">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helpText && <p className="text-xs text-azul/60 mt-1">{helpText}</p>}
    </div>
  );
}

// NumberField para números inteiros
interface NumberFieldProps extends BaseFieldProps {
  value: number;
  onChange: (value: number) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  step?: number;
  min?: number;
  max?: number;
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min,
  max,
  required = false,
  tooltip,
  helpText,
  className = "",
  id,
  _disabled
}: NumberFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {typeof prefix === "string" ? <span className="text-azul/50">{prefix}</span> : prefix}
          </div>
        )}
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value ? parseInt(e.target.value) : 0;
            onChange(newValue);
          }}
          className={cn(
            "border-azul/20 focus:border-azul focus:ring-1 focus:ring-azul/30",
            prefix && "pl-8",
            suffix && "pr-8"
          )}
          step={step}
          min={min}
          max={max}
          required={required}
          disabled={_disabled}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {typeof suffix === "string" ? <span className="text-azul/50">{suffix}</span> : suffix}
          </div>
        )}
      </div>
      {helpText && <p className="text-xs text-azul/60 mt-1">{helpText}</p>}
    </div>
  );
}

// Interface para as opções do dropdown
interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

// Props do DropdownField
interface DropdownFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  triggerClassName?: string;
}

export function DropdownField({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione uma opção",
  helpText,
  required = false,
  className = "",
  id,
  tooltip,
  _disabled,
  triggerClassName
}: DropdownFieldProps) {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          disabled={_disabled}
          className={cn(
            "w-full flex items-center justify-between",
            "h-10 px-3 py-2 text-sm",
            "bg-white border border-azul/20 rounded-md",
            "focus:outline-none focus:ring-1 focus:ring-azul/20 focus:border-azul/40",
            "hover:border-azul/30 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            !selectedOption && "text-slate-500",
            triggerClassName
          )}
        >
          {selectedOption?.label ?? placeholder}
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="start"
          className={cn(
            "w-[var(--radix-dropdown-menu-trigger-width)]",
            "bg-white rounded-md border border-azul/10",
            "shadow-lg shadow-azul/5",
            "animate-in fade-in-0 zoom-in-95",
            "p-1"
          )}
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-between px-3 py-2",
                "text-sm text-slate-600",
                "rounded-sm cursor-pointer select-none",
                "hover:bg-azul/5 focus:bg-azul/5 outline-none",
                "transition-colors",
                value === option.value && "bg-azul/5 text-azul font-medium"
              )}
            >
              <span className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </span>
              {value === option.value && (
                <Check className="h-3.5 w-3.5 text-azul" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
    </div>
  );
}