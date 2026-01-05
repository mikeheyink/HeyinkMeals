import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PantryPage } from './pages/pantry/IngredientsPage';
import { RecipeListPage } from './pages/recipes/RecipeListPage';
import { RecipeEditor } from './pages/recipes/RecipeEditor';
import { PlannerPage } from './pages/planner/PlannerPage';
import { ShoppingListPage } from './pages/planner/ShoppingListPage';
import { CookingPage } from './pages/cooking/CookingPage';
import { CookingMode } from './pages/cooking/CookingMode';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/planner" replace />} />
          <Route path="pantry" element={<PantryPage />} />
          <Route path="recipes" element={<RecipeListPage />} />
          <Route path="recipes/new" element={<RecipeEditor />} />
          <Route path="recipes/:id" element={<RecipeEditor />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="shopping-list" element={<ShoppingListPage />} />
          <Route path="cooking" element={<CookingPage />} />
          <Route path="cooking/:mealId" element={<CookingMode />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
