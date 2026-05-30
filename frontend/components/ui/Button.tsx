import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

/**
 * Button component — The Vault theme.
 * Warm amber gradients, deliberate transitions, no cold tones.
 */
export function Button({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = "relative inline-flex items-center justify-center px-6 py-3 rounded-[10px] font-medium tracking-wide transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/50 focus:ring-offset-2 focus:ring-offset-[#0A0806] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden active:scale-[0.97] text-sm select-none hover:-translate-y-0.5 active:translate-y-0";

  const variants = {
    primary: "bg-gradient-to-br from-[#E8A020] to-[#B86A1A] text-[#0A0806] font-bold shadow-[0_4px_15px_rgba(232,160,32,0.15)] hover:shadow-[0_8px_25px_rgba(232,160,32,0.3)]",
    secondary: "bg-[#1E160D] text-[#F0E6D0] border border-[#2A1E10] hover:border-[#E8A020] hover:text-[#F0E6D0]",
    outline: "bg-transparent border border-[#2A1E10] text-[#9A7D5A] hover:border-[#E8A020] hover:text-[#F0E6D0] hover:shadow-[0_0_15px_rgba(232,160,32,0.1)]",
    danger: "bg-[#1E160D] border border-[#CC4A3A]/30 text-[#CC4A3A] hover:bg-[#CC4A3A]/10 hover:border-[#CC4A3A]/50 shadow-[0_0_15px_rgba(204,74,58,0.05)] hover:shadow-[0_0_20px_rgba(204,74,58,0.15)]"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
