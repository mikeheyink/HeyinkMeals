import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ElementType;
    as?: any;
    to?: string;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    className = '',
    as: Component = 'button',
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
            className={`inline-flex items-center justify-center gap-2 font-medium transition-all ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />}
            {children}
        </Component>
    );
};
