import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ElementType;
    as?: any;
    to?: string;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    className = '',
    as: Component = 'button',
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-accent text-white hover:bg-accent/90',
        secondary: 'bg-base-300 text-ink-900 hover:bg-base-300/80',
        outline: 'bg-transparent border border-base-300 text-ink-700 hover:bg-base-200',
        ghost: 'bg-transparent text-ink-500 hover:text-ink-900 hover:bg-base-200'
    };

    const sizes = {
        sm: 'px-2.5 py-1.5 text-xs rounded',
        md: 'px-4 py-2 text-sm rounded-md',
        lg: 'px-6 py-3 text-base rounded-md'
    };

    return (
        <Component
            className={`inline-flex items-center justify-center gap-2 font-medium transition-all ${variants[variant]} ${sizes[size]} ${className} ${(loading || disabled) ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={loading || disabled}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : Icon ? (
                <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />
            ) : null}
            {children}
        </Component>
    );
};
