import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

export function Button({ children, variant = 'primary', isLoading = false, className = '', disabled, ...props }: ButtonProps) {
  const baseStyle = 'relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium tracking-wide transition-[transform,background,border-color,box-shadow,color] duration-160 ease-out focus:outline-none focus:ring-2 focus:ring-[#6EE7FF]/40 focus:ring-offset-2 focus:ring-offset-[#070B14] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[.97] select-none';
  const variants = {
    primary: 'bg-[#6EE7FF] text-[#07101D] font-bold shadow-[0_8px_24px_rgba(110,231,255,.16)] hover:bg-[#B4F4FF] hover:shadow-[0_10px_30px_rgba(110,231,255,.25)]',
    secondary: 'bg-[#111D31] text-[#E7EEF8] border border-[#1E2B42] hover:border-[#6EE7FF]/40 hover:bg-[#16263E]',
    outline: 'bg-transparent border border-[#1E2B42] text-[#8493AA] hover:border-[#6EE7FF]/45 hover:text-[#E7EEF8] hover:bg-[#0C1424]',
    danger: 'bg-[#321622] border border-[#FB7185]/25 text-[#FB7185] hover:bg-[#FB7185]/10 hover:border-[#FB7185]/50',
  };
  return (
    <button disabled={disabled || isLoading} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}
