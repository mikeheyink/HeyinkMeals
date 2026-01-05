import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string | React.ReactNode;
    actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
    return (
        <header className="flex justify-between items-end mb-8">
            <div>
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex gap-2 mb-0.5">{actions}</div>}
        </header>
    );
};
