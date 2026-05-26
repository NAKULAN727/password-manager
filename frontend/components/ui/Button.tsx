import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

/**
 * Highly polished interactive button component with micro-interactions,
 * gradients, and glow states.
 */
export function Button({
  children,
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = "relative inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#090D16] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden active:scale-97 text-sm select-none hover:-translate-y-0.5 active:translate-y-0";
  
  const variants = {
    primary: "bg-[#090D16] hover:bg-[#0F172A] text-[#F8F3E7] border border-[#D4AF37]/45 hover:border-[#D4AF37]/90 shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_25px_rgba(212,175,55,0.28)]",
    secondary: "bg-white/[0.03] hover:bg-white/[0.07] text-[#F8F3E7] backdrop-blur-md border border-white/5 hover:border-white/15",
    outline: "bg-transparent border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#D4AF37] hover:text-white hover:bg-[#D4AF37]/10 shadow-[inset_0_0_10px_rgba(212,175,55,0.03)] hover:shadow-[0_0_15px_rgba(212,175,55,0.15)]",
    danger: "bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
