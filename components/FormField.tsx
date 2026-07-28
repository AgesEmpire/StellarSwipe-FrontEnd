"use client";

import {
  ChangeEvent,
  FocusEvent,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { AlertCircle } from "lucide-react";

type ValidateFn = (value: string) => string | null;

interface UseFormValidationOptions {
  initialValues?: Record<string, string>;
  validate?: Record<string, ValidateFn>;
}

export function useFormValidation({
  initialValues = {},
  validate = {},
}: UseFormValidationOptions = {}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setValue = useCallback(
    (name: string, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (touched[name] && validate[name]) {
        const error = validate[name](value);
        setErrors((prev) => ({ ...prev, [name]: error ?? "" }));
      }
    },
    [touched, validate]
  );

  const setFieldTouched = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      if (validate[name]) {
        const error = validate[name](values[name] ?? "");
        setErrors((prev) => ({ ...prev, [name]: error ?? "" }));
      }
    },
    [validate, values]
  );

  const validateAll = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    let valid = true;
    for (const [name, fn] of Object.entries(validate)) {
      const error = fn(values[name] ?? "");
      if (error) {
        nextErrors[name] = error;
        valid = false;
      }
    }
    setErrors(nextErrors);
    setTouched(
      Object.keys(validate).reduce(
        (acc, k) => ({ ...acc, [k]: true }),
        {} as Record<string, boolean>
      )
    );
    return valid;
  }, [validate, values]);

  const isValid = useMemo(
    () => Object.values(errors).every((e) => !e),
    [errors]
  );

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    isValid,
  };
}

interface SelectOption {
  label: string;
  value: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "select";
  required?: boolean;
  validate?: ValidateFn;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  validate: validateFn,
  error: externalError,
  value = "",
  onChange,
  onBlur,
  options = [],
  placeholder,
  disabled = false,
  className = "",
}: FormFieldProps) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  const error = externalError ?? internalError;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
      if (validateFn) {
        const err = validateFn(newValue);
        setInternalError(err);
      }
    },
    [onChange, validateFn]
  );

  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (validateFn) {
        const err = validateFn(value);
        setInternalError(err);
      }
      onBlur?.();
    },
    [value, validateFn, onBlur]
  );

  const inputClasses = `w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none transition-colors ${
    error
      ? "border-destructive focus:ring-1 focus:ring-destructive"
      : "border-border focus:border-foreground focus:ring-1 focus:ring-foreground/20"
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {type === "select" ? (
        <select
          id={fieldId}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={inputClasses}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={inputClasses}
        />
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
