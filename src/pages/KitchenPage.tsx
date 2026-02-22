import { useState } from 'react';
import { RecipeListPage } from './recipes/RecipeListPage';
import { PantryPage } from './pantry/IngredientsPage';

export const KitchenPage = () => {
    const [activeTab, setActiveTab] = useState<'recipes' | 'pantry'>('recipes');

    return (
        <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-base-200 rounded-xl w-fit mx-auto sm:mx-0">
                <button
                    onClick={() => setActiveTab('recipes')}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'recipes'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-ink-500 hover:text-ink-900'
                        }`}
                >
                    Recipes
                </button>
                <button
                    onClick={() => setActiveTab('pantry')}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pantry'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-ink-500 hover:text-ink-900'
                        }`}
                >
                    Pantry
                </button>
            </div>

            <div className="mt-6">
                {activeTab === 'recipes' ? <RecipeListPage /> : <PantryPage />}
            </div>
        </div>
    );
};
