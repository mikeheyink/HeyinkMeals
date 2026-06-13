import { useState } from 'react';
import { RecipeListPage } from './recipes/RecipeListPage';
import { ListsPage } from './lists/ListsPage';
import { PantryPage } from './pantry/IngredientsPage';

type Tab = 'recipes' | 'lists' | 'pantry';

const TABS: { key: Tab; label: string }[] = [
    { key: 'recipes', label: 'Recipes' },
    { key: 'lists', label: 'Lists' },
    { key: 'pantry', label: 'Pantry' },
];

export const KitchenPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('recipes');

    return (
        <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-base-200 rounded-xl w-fit mx-auto sm:mx-0">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === key
                            ? 'bg-white text-accent shadow-sm'
                            : 'text-ink-500 hover:text-ink-900'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {activeTab === 'recipes' && <RecipeListPage />}
                {activeTab === 'lists' && <ListsPage />}
                {activeTab === 'pantry' && <PantryPage />}
            </div>
        </div>
    );
};
