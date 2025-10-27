import React, { forwardRef } from 'react';
import './AyuInput.css';

interface AyuInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  help?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  className?: string;
  name?: string;
  id?: string;
  autoComplete?: string;
}

const AyuInput = forwardRef<HTMLInputElement, AyuInputProps>(({
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error,
  help,
  label,
  size = 'md',
  variant = 'default',
  className = '',
  name,
  id,
  autoComplete,
}, ref) => {
  const baseClasses = 'ayu-input';
  const sizeClasses = `ayu-input--${size}`;
  const variantClasses = `ayu-input--${variant}`;
  const stateClasses = error ? 'ayu-input--error' : '';
  const disabledClasses = disabled ? 'ayu-input--disabled' : '';

  const inputClasses = [
    baseClasses,
    sizeClasses,
    variantClasses,
    stateClasses,
    disabledClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="ayu-input-group">
      {label && (
        <label htmlFor={id} className="ayu-input__label">
          {label}
          {required && <span className="ayu-input__required">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClasses}
      />
      
      {error && (
        <div className="ayu-input__error">
          {error}
        </div>
      )}
      
      {help && !error && (
        <div className="ayu-input__help">
          {help}
        </div>
      )}
    </div>
  );
});

AyuInput.displayName = 'AyuInput';

export default AyuInput;
