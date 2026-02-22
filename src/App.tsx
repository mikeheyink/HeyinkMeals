import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { KitchenPage } from './pages/KitchenPage';
import { AdminPage } from './pages/AdminPage';
import { RecipeEditor } from './pages/recipes/RecipeEditor';
import { PlannerPage } from './pages/planner/PlannerPage';
import { ShoppingListPage } from './pages/planner/ShoppingListPage';
import { CookingPage } from './pages/cooking/CookingPage';
import { CookingMode } from './pages/cooking/CookingMode';

import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toaster } from 'sonner';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/planner" replace />} />
            <Route path="kitchen" element={<KitchenPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="recipes/new" element={<RecipeEditor />} />
            <Route path="recipes/:id" element={<RecipeEditor />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="shopping-list" element={<ShoppingListPage />} />
            <Route path="cooking" element={<CookingPage />} />
            <Route path="cooking/:mealId" element={<CookingMode />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </ErrorBoundary>
  );
}

export default App;

