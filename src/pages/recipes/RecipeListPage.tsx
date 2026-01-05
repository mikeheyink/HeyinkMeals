import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Plus, BookOpen, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';

export const RecipeListPage = () => {
    const [recipes, setRecipes] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecipes = async () => {
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .order('name');

            if (!error && data) {
                setRecipes(data);
            }
        };

        fetchRecipes();
    }, []);

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url.replace(/^https?:\/\//, '').split('/')[0].replace('www.', '');
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Library of Recipes"
                subtitle="Your stored culinary sequences."
                actions={
                    <Button onClick={() => navigate('/recipes/new')} icon={Plus}>
                        New Recipe
                    </Button>
                }
            />

            {/* Desktop Table View */}
            <div className="hidden md:block zen-table-container">
                <table className="zen-table">
                    <thead className="zen-table-header">
                        <tr>
                            <th className="zen-table-cell w-1/2">Recipe Name</th>
                            <th className="zen-table-cell">Servings</th>
                            <th className="zen-table-cell">Time</th>
                            <th className="zen-table-cell">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recipes.map((recipe) => (
                            <tr
                                key={recipe.id}
                                className="zen-table-row group cursor-pointer"
                                onClick={() => navigate(`/recipes/${recipe.id}`)}
                            >
                                <td className="zen-table-cell">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-base-300 rounded text-ink-500 group-hover:text-accent transition-colors">
                                            <BookOpen size={16} />
                                        </div>
                                        <span className="font-bold text-ink-900 group-hover:text-accent transition-colors">
                                            {recipe.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="zen-table-cell">
                                    <div className="flex items-center gap-1.5 text-ink-500">
                                        <Users size={14} />
                                        <span className="text-xs font-medium">{recipe.servings}</span>
                                    </div>
                                </td>
                                <td className="zen-table-cell">
                                    {recipe.total_time_mins > 0 && (
                                        <span className="text-xs text-ink-500 font-medium">
                                            {recipe.total_time_mins} min
                                        </span>
                                    )}
                                </td>
                                <td className="zen-table-cell">
                                    {recipe.web_source && (
                                        <span className="zen-badge lowercase truncate max-w-[150px] inline-block">
                                            {getDomain(recipe.web_source)}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {recipes.map((recipe) => (
                    <div
                        key={recipe.id}
                        onClick={() => navigate(`/recipes/${recipe.id}`)}
                        className="p-4 bg-white border border-base-300 rounded-xl shadow-sm active:bg-base-200 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-ink-900 text-base leading-tight">
                                {recipe.name}
                            </h3>
                            {recipe.web_source && (
                                <span className="zen-badge lowercase max-w-[100px] truncate shrink-0 ml-2">
                                    {getDomain(recipe.web_source)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-ink-500">
                            <div className="flex items-center gap-1.5">
                                <Users size={14} />
                                <span className="text-xs font-medium">{recipe.servings}</span>
                            </div>
                            {recipe.total_time_mins > 0 && (
                                <span className="text-xs font-medium">
                                    {recipe.total_time_mins} min
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
