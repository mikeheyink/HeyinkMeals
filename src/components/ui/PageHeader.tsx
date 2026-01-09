import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string | React.ReactNode;
    actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8">
            <div className="min-w-0">
                <h1 className="page-title truncate">{title}</h1>
                {subtitle && <div className="page-subtitle mt-1">{subtitle}</div>}
            </div>
            {actions && <div className="flex gap-2 flex-shrink-0">{actions}</div>}
        </header>
    );
};
