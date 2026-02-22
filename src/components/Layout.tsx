
import { NavLink, Outlet } from 'react-router-dom';
import { List, BookOpen, Calendar, ShoppingCart, Settings } from 'lucide-react';

export const Layout = () => {
    // Flattened navigation items
    const navItems = [
        { to: '/planner', icon: Calendar, label: 'Plan' },
        { to: '/shopping-list', icon: ShoppingCart, label: 'Shop' },
        { to: '/cooking', icon: BookOpen, label: 'Cook' },
        { to: '/kitchen', icon: List, label: 'Kitchen' }
    ];

    return (
        <div className="min-h-screen bg-base-200">
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 hidden lg:flex flex-col bg-white border-r border-base-300 z-50">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-ink-900 tracking-tight">Heyink<span className="text-accent">Meals</span></h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
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
                </nav>

                <div className="p-4 border-t border-base-300">
                    <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 w-full transition-colors text-sm font-medium rounded-md ${isActive ? 'bg-accent/10 text-accent' : 'text-ink-500 hover:bg-base-200 hover:text-ink-900'
                            }`
                        }
                    >
                        <Settings size={18} strokeWidth={2} />
                        Settings
                    </NavLink>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
                <div className="p-4 md:p-8 max-w-7xl mx-auto pt-8">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-base-300 shadow-2xl z-40 flex items-stretch overflow-hidden px-2 pb-safe">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${isActive
                                ? 'text-accent'
                                : 'text-ink-400 hover:text-ink-600'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-accent/10' : ''}`}>
                                    <Icon size={20} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}

                {/* Admin Mobile Link */}
                <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                        `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${isActive
                            ? 'text-accent'
                            : 'text-ink-400 hover:text-ink-600'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-accent/10' : ''}`}>
                                <Settings size={20} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                                Admin
                            </span>
                        </>
                    )}
                </NavLink>
            </nav>
        </div>
    );
};

