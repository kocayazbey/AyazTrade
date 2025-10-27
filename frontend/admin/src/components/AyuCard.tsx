import React from 'react';
import './AyuCard.css';

interface AyuCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

const AyuCard: React.FC<AyuCardProps> = ({
  children,
  title,
  subtitle,
  header,
  footer,
  className = '',
  variant = 'default',
  size = 'md',
}) => {
  const baseClasses = 'ayu-card';
  const variantClasses = `ayu-card--${variant}`;
  const sizeClasses = `ayu-card--${size}`;

  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {(title || subtitle || header) && (
        <div className="ayu-card__header">
          {header || (
            <>
              {title && <h3 className="ayu-card__title">{title}</h3>}
              {subtitle && <p className="ayu-card__subtitle">{subtitle}</p>}
            </>
          )}
        </div>
      )}
      
      <div className="ayu-card__body">
        {children}
      </div>
      
      {footer && (
        <div className="ayu-card__footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default AyuCard;
