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
  const baseStyle = "relative inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#090D16] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden active:scale-95 text-sm select-none";
  
  const variants = {
    primary: "bg-[#1E293B] hover:bg-[#253248] text-white border border-[#D4AF37]/35 hover:border-[#D4AF37]/70 shadow-[0_0_20px_rgba(212,175,55,0.06)] hover:shadow-[0_0_30px_rgba(212,175,55,0.22)]",
    secondary: "bg-white/5 hover:bg-white/10 text-white backdrop-blur-md border border-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
    outline: "bg-transparent border-2 border-[#D4AF37]/35 hover:border-[#D4AF37] text-[#D4AF37] hover:text-white hover:bg-[#D4AF37]/10 shadow-[inset_0_0_12px_rgba(212,175,55,0.05)] hover:shadow-[inset_0_0_20px_rgba(212,175,55,0.15)]",
    danger: "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
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
