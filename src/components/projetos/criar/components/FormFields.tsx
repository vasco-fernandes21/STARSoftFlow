import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  disabled?: boolean;
}

// FormLabel simplificado
interface FormLabelProps extends React.ComponentProps<typeof Label> {
  required?: boolean;
  tooltip?: string;
}

function FormLabel({ children, required, tooltip, ...props }: FormLabelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label {...props} className="font-medium text-azul/80">
        {children} {required && <span className="text-red-500">*</span>}
      </Label>
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger tabIndex={-1}>
              <HelpCircle className="h-3.5 w-3.5 cursor-help text-azul/40 hover:text-azul/60" />
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
  disabled,
  onBlur,
}: TextFieldProps) {
  const _disabled = disabled;
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
        value={value || ""}
        onChange={(e) => {
          console.log("TextField onChange:", e.target.value); // Depuração
          if (onChange) onChange(e.target.value);
        }}
        placeholder={placeholder}
        className="rounded-lg border-azul/20 bg-white/90 shadow-sm transition-all duration-200 hover:border-azul/30 focus:border-azul focus:ring-1 focus:ring-azul/30"
        required={required}
        disabled={_disabled}
        onBlur={onBlur}
      />
      {helpText && (
        <p
          className={cn(
            "mt-1 text-xs",
            helpText.includes("deve ter") || helpText.includes("obrigatório")
              ? "text-red-500"
              : "text-azul/60"
          )}
        >
          {helpText}
        </p>
      )}
    </div>
  );
}

// DecimalField atualizado
interface DecimalFieldProps extends BaseFieldProps {
  value: string | number | null;  // Alterado para incluir string
  onChange: (value: number | null) => void;
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
  disabled,
}: DecimalFieldProps) {
  const _disabled = disabled;
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <div className="relative">
        {prefix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {typeof prefix === "string" ? <span className="text-azul/50">{prefix}</span> : prefix}
          </div>
        )}
        <Input
          id={id}
          type="number"
          value={typeof value === 'string' ? value : (value ?? '')}  // Passa string diretamente
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              if (onChange) onChange(null);
            } else {
              const newValue = parseFloat(val);
              if (onChange) onChange(isNaN(newValue) ? null : newValue);
            }
          }}
          className={cn(
            "rounded-lg border-azul/20 bg-white/90 shadow-sm transition-all duration-200 hover:border-azul/30 focus:border-azul focus:ring-1 focus:ring-azul/30",
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
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            {typeof suffix === "string" ? <span className="text-azul/50">{suffix}</span> : suffix}
          </div>
        )}
      </div>
      {helpText && <p className="mt-1 text-xs text-azul/60">{helpText}</p>}
    </div>
  );
}

// MoneyField atualizado
export function MoneyField(props: Omit<DecimalFieldProps, "prefix" | "step" | "min" | "max">) {
  return <DecimalField {...props} prefix="€" step={0.01} min={0} max={1000000} />;
}

// PercentageField atualizado
export function PercentageField(props: Omit<DecimalFieldProps, "suffix" | "step" | "min" | "max">) {
  // Componente modificado para exibir percentual como número inteiro (0-100)
  // mas armazenar internamente como decimal (0-1)
  const { value, onChange, ...restProps } = props;

  // Converter o valor decimal para exibição (0.85 -> 85)
  const displayValue = value !== null ? (value as number) * 100 : null;

  // Função para converter o valor de entrada (85) para decimal (0.85)
  const handleChange = (newValue: number | null) => {
    if (newValue === null) {
      onChange(null);
    } else {
      // Dividir por 100 para transformar em decimal
      onChange(newValue / 100);
    }
  };

  return (
    <DecimalField
      {...restProps}
      value={displayValue}
      onChange={handleChange}
      suffix="%"
      step={1}
      min={0}
      max={10000}
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
  disabled,
}: TextareaFieldProps) {
  const _disabled = disabled;
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
        value={value || ""}
        onChange={(e) => {
          console.log("TextareaField onChange:", e.target.value);
          if (onChange) onChange(e.target.value);
        }}
        placeholder={placeholder}
        className="min-h-[100px] rounded-lg border-azul/20 bg-white/90 shadow-sm transition-all duration-200 hover:border-azul/30 focus:border-azul focus:ring-1 focus:ring-azul/30"
        required={required}
        rows={rows}
        disabled={_disabled}
      />
      {helpText && <p className="mt-1 text-xs text-azul/60">{helpText}</p>}
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
  disabled,
}: DateFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <div className={disabled ? "pointer-events-none opacity-60" : ""}>
        <DatePicker
          value={value ?? undefined}
          onChange={(date) => {
            console.log("DateField onChange:", date);
            if (onChange) onChange(date ?? null);
          }}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
      {helpText && <p className="mt-1 text-xs text-azul/60">{helpText}</p>}
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
  disabled,
}: SelectFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <Select
        value={value}
        onValueChange={(val) => {
          console.log("SelectField onChange:", val);
          if (onChange) onChange(val);
        }}
        disabled={disabled}
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
      {helpText && <p className="mt-1 text-xs text-azul/60">{helpText}</p>}
    </div>
  );
}

// NumberField para números inteiros
interface NumberFieldProps extends BaseFieldProps {
  value: string | number;
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
  disabled,
}: NumberFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>
      <div className="relative">
        {prefix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            {typeof prefix === "string" ? <span className="text-azul/50">{prefix}</span> : prefix}
          </div>
        )}
        <Input
          id={id}
          type="number"
          value={typeof value === 'string' ? value : value}  // Passa string diretamente
          onChange={(e) => {
            const newValue = e.target.value ? parseInt(e.target.value) : 0;
            if (onChange) onChange(newValue);
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
          disabled={disabled}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            {typeof suffix === "string" ? <span className="text-azul/50">{suffix}</span> : suffix}
          </div>
        )}
      </div>
      {helpText && <p className="mt-1 text-xs text-azul/60">{helpText}</p>}
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
  disabled,
  triggerClassName,
}: DropdownFieldProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel htmlFor={id} required={required} tooltip={tooltip}>
        {label}
      </FormLabel>

      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between",
            "h-10 px-3 py-2 text-sm",
            "rounded-md border border-azul/20 bg-white",
            "focus:border-azul/40 focus:outline-none focus:ring-1 focus:ring-azul/20",
            "transition-colors hover:border-azul/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
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
            "rounded-md border border-azul/10 bg-white",
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
                "cursor-pointer select-none rounded-sm",
                "outline-none hover:bg-azul/5 focus:bg-azul/5",
                "transition-colors",
                value === option.value && "bg-azul/5 font-medium text-azul"
              )}
            >
              <span className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </span>
              {value === option.value && <Check className="h-3.5 w-3.5 text-azul" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}
