import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

import AdminDashboard from "@/pages/AdminDashboard";
import NewContest from "@/pages/NewContest";
import EditContest from "@/pages/EditContest";
import ContestManager from "@/pages/ContestManager";
import PublicBoard from "@/pages/PublicBoard";
import MyContests from "@/pages/MyContests";
import NotFound from "@/pages/not-found";

function LoginRedirect() {
  useEffect(() => {
    window.location.href = '/api/login';
  }, []);
  return <div className="flex items-center justify-center min-h-screen">
    <p className="text-muted-foreground">Redirecting to login...</p>
  </div>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-destructive">Access denied - Admin privileges required</p>
    </div>;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/admin" />} />
      <Route path="/login" component={LoginRedirect} />
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin/contest/new">
        {() => <ProtectedRoute component={NewContest} />}
      </Route>
      <Route path="/admin/contest/:id/edit">
        {() => <ProtectedRoute component={EditContest} />}
      </Route>
      <Route path="/admin/contest/:id">
        {() => <ProtectedRoute component={ContestManager} />}
      </Route>
      <Route path="/board/:id" component={PublicBoard} />
      <Route path="/pool/:operatorSlug/:contestSlug" component={PublicBoard} />
      <Route path="/my-contests" component={MyContests} />
      <Route path="/:operatorSlug/:contestSlug" component={PublicBoard} />
      <Route path="/:slug" component={PublicBoard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
