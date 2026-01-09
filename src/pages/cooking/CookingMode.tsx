import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { recipeService } from '../../services/recipeService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Timer, ChefHat, CheckCircle2, Play, Pause, RotateCcw, List, BookOpen } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useIsMobile } from '../../hooks/useMediaQuery';

export const CookingMode = () => {
    const { mealId } = useParams();
    const navigate = useNavigate();
    const [meal, setMeal] = useState<any>(null);
    const [recipe, setRecipe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
    const isMobile = useIsMobile();

    // Timer state
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerInput, setTimerInput] = useState(5);

    useEffect(() => {
        const loadMealData = async () => {
            if (!mealId) return;
            setLoading(true);
            try {
                const { data: mealData } = await supabase
                    .from('meal_plan_entries')
                    .select('*')
                    .eq('id', mealId)
                    .single();

                if (mealData) {
                    setMeal(mealData);
                    const recipeData = await recipeService.getRecipe(mealData.reference_id);
                    setRecipe(recipeData);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadMealData();
    }, [mealId]);

    useEffect(() => {
        let interval: any;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    const toggleIngredient = (id: string) => {
        const newSet = new Set(checkedIngredients);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setCheckedIngredients(newSet);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (timeLeft === 0) setTimeLeft(timerInput * 60);
        setIsTimerRunning(true);
    };

    if (loading) return <div className="p-20 text-center"><ChefHat className="animate-spin inline-block mr-2" /> Loading Chef Station...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-32">
            <PageHeader
                title={recipe?.name || "Loading..."}
                subtitle={<div className="flex items-center gap-2"><span className="zen-badge">{meal?.slot}</span><span className="text-ink-300">•</span><span>{meal?.diner_type}</span></div>}
                actions={
                    <Button variant="ghost" size="sm" onClick={() => navigate('/cooking')}>
                        <ChevronLeft size={20} className="mr-1" />
                        Back to Terminal
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mobile Tab Navigation */}
                {isMobile && (
                    <div className="flex p-1 bg-base-200 rounded-xl">
                        <button
                            onClick={() => setActiveTab('ingredients')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'ingredients'
                                    ? 'bg-white shadow-sm text-accent'
                                    : 'text-ink-500'
                                }`}
                        >
                            <List size={16} />
                            Ingredients
                        </button>
                        <button
                            onClick={() => setActiveTab('instructions')}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'instructions'
                                    ? 'bg-white shadow-sm text-accent'
                                    : 'text-ink-500'
                                }`}
                        >
                            <BookOpen size={16} />
                            Instructions
                        </button>
                    </div>
                )}

                {/* Ingredients / Mise en Place */}
                <div className={`lg:col-span-1 space-y-6 ${isMobile && activeTab !== 'ingredients' ? 'hidden' : ''}`}>
                    <div>
                        <h2 className="section-title flex items-center gap-2">
                            <CheckCircle2 size={12} />
                            Mise en Place
                        </h2>
                        <Card className="p-4 space-y-2">
                            {recipe?.ingredients_list?.items.map((item: any) => (
                                <label
                                    key={item.id}
                                    className={`flex items-start gap-3 p-2 rounded-md transition-colors cursor-pointer hover:bg-base-200 ${checkedIngredients.has(item.id) ? 'opacity-50' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 w-5 h-5 rounded border-base-300 text-accent focus:ring-accent"
                                        checked={checkedIngredients.has(item.id)}
                                        onChange={() => toggleIngredient(item.id)}
                                    />
                                    <div className="text-sm sm:text-base">
                                        <span className="font-semibold">{item.quantity} {item.unit}</span>
                                        <span className="ml-1 text-ink-700">{item.grocery_type?.name}</span>
                                    </div>
                                </label>
                            ))}
                        </Card>
                    </div>

                    {/* Timer Tool */}
                    <div>
                        <h2 className="section-title flex items-center gap-2">
                            <Timer size={12} />
                            Active Timer
                        </h2>
                        <Card className="p-6 text-center space-y-4 bg-ink-900 text-white border-none shadow-xl">
                            <div className="text-5xl font-mono font-bold tracking-tighter">
                                {formatTime(timeLeft || timerInput * 60)}
                            </div>
                            <div className="flex justify-center gap-2">
                                {!isTimerRunning ? (
                                    <Button onClick={startTimer} className="bg-white text-ink-900 hover:bg-white/90">
                                        <Play size={18} fill="currentColor" />
                                        Start
                                    </Button>
                                ) : (
                                    <Button onClick={() => setIsTimerRunning(false)} variant="secondary">
                                        <Pause size={18} fill="currentColor" />
                                        Pause
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    className="text-white/40 hover:text-white hover:bg-white/10"
                                    onClick={() => { setTimeLeft(0); setIsTimerRunning(false); }}
                                >
                                    <RotateCcw size={18} />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 justify-center text-xs text-white/40">
                                <span>Set for</span>
                                <input
                                    type="number"
                                    value={timerInput}
                                    onChange={(e) => setTimerInput(parseInt(e.target.value) || 0)}
                                    className="bg-transparent border-b border-white/20 w-8 text-center focus:outline-none focus:border-white"
                                />
                                <span>minutes</span>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Instructions */}
                <div className={`lg:col-span-2 space-y-6 ${isMobile && activeTab !== 'instructions' ? 'hidden' : ''}`}>
                    <div>
                        <h2 className="section-title flex items-center gap-2">
                            <ChefHat size={12} />
                            Execution Steps
                        </h2>
                        <Card className="p-8">
                            <p className="text-ink-700 leading-relaxed whitespace-pre-wrap text-lg">
                                {recipe?.instructions || "No instructions provided for this recipe."}
                            </p>
                        </Card>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button size="lg" className="px-12" onClick={() => navigate('/cooking')}>
                            Meal Completed
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Timer */}
            {isMobile && (isTimerRunning || timeLeft > 0) && (
                <div className="fixed bottom-20 left-2 right-2 bg-ink-900 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between z-50">
                    <div className="text-3xl font-mono font-bold">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="flex gap-2">
                        {isTimerRunning ? (
                            <Button onClick={() => setIsTimerRunning(false)} variant="secondary" size="sm">
                                <Pause size={16} fill="currentColor" />
                            </Button>
                        ) : (
                            <Button onClick={startTimer} size="sm" className="bg-white text-ink-900">
                                <Play size={16} fill="currentColor" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/40 hover:text-white"
                            onClick={() => { setTimeLeft(0); setIsTimerRunning(false); }}
                        >
                            <RotateCcw size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
