import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  color?: 'default' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', color = 'default', className = '', children, ...props }: ButtonProps) {
  const baseClass = variant === 'primary' ? 'primary-button' : 'ghost-button';
  const colorClass = color === 'danger' ? 'danger' : '';
  
  return (
    <button className={`${baseClass} ${colorClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
