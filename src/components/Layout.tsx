import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { List, BookOpen, Calendar, ShoppingCart, Settings, Menu, X } from 'lucide-react';

export const Layout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { to: '/planner', icon: Calendar, label: 'Planner' },
        { to: '/shopping-list', icon: ShoppingCart, label: 'Shopping' },
        { to: '/cooking', icon: BookOpen, label: 'Cooking' }
    ];

    const libraryItems = [
        { to: '/pantry', icon: List, label: 'Pantry' },
        { to: '/recipes', icon: BookOpen, label: 'Recipes' }
    ];

    return (
        <div className="min-h-screen bg-base-200">
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 hidden lg:flex flex-col bg-white border-r border-base-300 z-50">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-ink-900 tracking-tight">Heyink<span className="text-accent">Meals</span></h1>
                </div>

                <nav className="flex-1 px-4 space-y-8 mt-4">
                    <div className="space-y-1">
                        <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-ink-300">Operations</div>
                        {navItems.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-ink-500 hover:bg-base-200 hover:text-ink-900'
                                    }`
                                }
                            >
                                <Icon size={18} />
                                {label}
                            </NavLink>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-ink-300">Library</div>
                        {libraryItems.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-ink-500 hover:bg-base-200 hover:text-ink-900'
                                    }`
                                }
                            >
                                <Icon size={18} />
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="p-4 border-t border-base-300">
                    <button className="flex items-center gap-3 px-3 py-2 w-full text-ink-500 hover:text-ink-900 transition-colors text-sm font-medium">
                        <Settings size={18} strokeWidth={2} />
                        Settings
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-base-300 px-6 flex justify-between items-center z-40">
                <h1 className="text-lg font-bold text-ink-900">Heyink<span className="text-accent">Meals</span></h1>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-ink-900">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 bg-white z-30 pt-20 px-6 overflow-y-auto pb-10">
                    <nav className="space-y-8">
                        <div>
                            <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-ink-300">Operations</div>
                            <div className="space-y-4">
                                {[...navItems].map(({ to, icon: Icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-4 py-3 text-lg font-semibold ${isActive ? 'text-accent' : 'text-ink-500'
                                            }`
                                        }
                                    >
                                        <Icon size={24} />
                                        {label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-ink-300">Library</div>
                            <div className="space-y-4">
                                {libraryItems.map(({ to, icon: Icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-4 py-3 text-lg font-semibold ${isActive ? 'text-accent' : 'text-ink-500'
                                            }`
                                        }
                                    >
                                        <Icon size={24} />
                                        {label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen pb-20 lg:pb-0">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-1 left-1 right-1 h-16 bg-white/95 backdrop-blur-md border border-base-300 rounded-2xl shadow-2xl z-40 flex items-stretch overflow-hidden px-2">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${isActive
                                ? 'text-accent'
                                : 'text-ink-300'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-accent/10' : ''}`}>
                                    <Icon size={20} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};
