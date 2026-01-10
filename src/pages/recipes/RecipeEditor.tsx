import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recipeService } from '../../services/recipeService';
import { pantryService } from '../../services/pantryService';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { AddGroceryModal } from '../../components/AddGroceryModal';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';

export const RecipeEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id;

    const [loading, setLoading] = useState(false);
    const [groceries, setGroceries] = useState<any[]>([]);

    // Recipe State
    const [name, setName] = useState('');
    const [servings, setServings] = useState(4);
    const [instructions, setInstructions] = useState('');
    const [ingredients, setIngredients] = useState<any[]>([]);

    // Add Ingredient State
    const [selGrocery, setSelGrocery] = useState('');
    const [qty, setQty] = useState(1);
    const [unit, setUnit] = useState('items');
    const [isAddGroceryModalOpen, setIsAddGroceryModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const g = await pantryService.getGroceries();
            setGroceries(g);
            if (g.length) setSelGrocery(g[0].id);

            if (!isNew && id) {
                const r = await recipeService.getRecipe(id);
                if (r) {
                    setName(r.name);
                    setServings(r.servings || 4);
                    setInstructions(r.instructions || '');
                    if (r.ingredients_list?.items) {
                        setIngredients(r.ingredients_list.items);
                    }
                }
            }
        };
        loadData();
    }, [id, isNew]);

    const handleSave = async () => {
        if (!name) return;
        setLoading(true);
        try {
            if (isNew) {
                const r = await recipeService.createRecipe(name, instructions, servings);
                navigate(`/recipes/${r.id}`);
            } else {
                console.log('Update not yet implemented in service');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIngredient = async () => {
        if (!id || isNew) {
            alert("Please save the recipe first before adding ingredients.");
            return;
        }

        try {
            await recipeService.addIngredientToRecipe(id, selGrocery, qty, unit);
            const r = await recipeService.getRecipe(id);
            setIngredients(r.ingredients_list.items);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <PageHeader
                title={isNew ? 'New Culinary Script' : 'Edit Script'}
                subtitle={isNew ? 'Define a new sequence for your household.' : `Modifying ${name}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/recipes')} icon={ArrowLeft}>
                            Back to Library
                        </Button>
                        <Button onClick={handleSave} disabled={loading} icon={Save}>
                            {isNew ? 'Create Script' : 'Save Changes'}
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-6">
                        <div className="space-y-6">
                            <div>
                                <label className="section-title">Sequence Name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="zen-input w-full text-lg font-bold"
                                    placeholder="e.g. Grandma's Stew"
                                />
                            </div>

                            <div>
                                <label className="section-title">Execution Steps</label>
                                <textarea
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    className="zen-input w-full h-48 resize-none text-base"
                                    placeholder="Detailed instructions..."
                                />
                            </div>
                        </div>
                    </Card>

                    {!isNew && (
                        <div>
                            <h2 className="section-title mb-4 pl-1">Components</h2>
                            <Card className="p-6">
                                <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-base-200 rounded-xl items-end border border-base-300">
                                    <div className="flex-1 w-full">
                                        <label className="text-[10px] font-bold uppercase text-ink-300 block mb-1">Ingredient</label>
                                        <SearchableSelect
                                            options={groceries}
                                            value={selGrocery}
                                            onChange={(val) => setSelGrocery(val)}
                                            getOptionValue={(g) => g.id}
                                            getOptionLabel={(g) => g.name}
                                            placeholder="Select ingredient..."
                                            searchPlaceholder="Search ingredients..."
                                            onAddNew={() => setIsAddGroceryModalOpen(true)}
                                            addNewLabel="Create new ingredient..."
                                        />
                                    </div>
                                    <div className="w-full md:w-24">
                                        <label className="text-[10px] font-bold uppercase text-ink-300 block mb-1">Qty</label>
                                        <input
                                            type="number"
                                            value={qty}
                                            onChange={e => setQty(Number(e.target.value))}
                                            className="zen-input w-full"
                                        />
                                    </div>
                                    <div className="w-full md:w-28">
                                        <label className="text-[10px] font-bold uppercase text-ink-300 block mb-1">Unit</label>
                                        <input
                                            value={unit}
                                            onChange={e => setUnit(e.target.value)}
                                            className="zen-input w-full"
                                        />
                                    </div>
                                    <Button size="sm" onClick={handleAddIngredient} icon={Plus}>Add</Button>
                                </div>

                                <div className="space-y-1">
                                    {ingredients.map((ing: any) => (
                                        <div key={ing.id} className="flex justify-between items-center p-3 border-b border-base-300 last:border-0 hover:bg-base-100 transition-colors rounded-lg">
                                            <span className="font-semibold text-ink-900">{ing.grocery_type.name}</span>
                                            <span className="text-accent font-bold text-sm">
                                                {ing.quantity} {ing.unit}
                                            </span>
                                        </div>
                                    ))}
                                    {ingredients.length === 0 && (
                                        <div className="py-8 text-center text-ink-300 text-sm italic">
                                            No components defined yet.
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Sidebar / Actions */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="section-title mb-4">Metadata</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-ink-300 block mb-1">Servings</label>
                                <input
                                    type="number"
                                    value={servings}
                                    onChange={e => setServings(Number(e.target.value))}
                                    className="zen-input w-full"
                                />
                            </div>

                            <hr className="border-base-300 my-4" />

                            <Button className="w-full" onClick={handleSave} disabled={loading}>
                                <Save size={18} />
                                {isNew ? 'Create Script' : 'Save Changes'}
                            </Button>

                            {isNew && (
                                <p className="text-[10px] text-center mt-4 text-ink-300 font-medium">
                                    Creation of sequence required before adding components.
                                </p>
                            )}
                        </div>
                    </Card>
                </div>

            </div>

            <AddGroceryModal
                isOpen={isAddGroceryModalOpen}
                onClose={() => setIsAddGroceryModalOpen(false)}
                onItemAdded={(grocery) => {
                    const loadData = async () => {
                        const g = await pantryService.getGroceries();
                        setGroceries(g);
                        setSelGrocery(grocery.id);
                    }
                    loadData();
                }}
            />
        </div >
    );
};
