import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { DevCapture } from './components/DevCapture';
import { KitchenPage } from './pages/KitchenPage';
import { AdminPage } from './pages/AdminPage';
import { RecipeEditor } from './pages/recipes/RecipeEditor';
import { PlannerPage } from './pages/planner/PlannerPage';
import { ShoppingListPage } from './pages/planner/ShoppingListPage';
import { CookingPage } from './pages/cooking/CookingPage';
import { CookingMode } from './pages/cooking/CookingMode';
import { LoginPage } from './pages/LoginPage';

import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toaster } from 'sonner';
import { useSession } from './lib/useSession';

function App() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center text-ink-300">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/planner" replace /> : <LoginPage />}
          />
          <Route path="/" element={session ? <Layout /> : <Navigate to="/login" replace />}>
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
        {session && <DevCapture />}
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </ErrorBoundary>
  );
}

export default App;
