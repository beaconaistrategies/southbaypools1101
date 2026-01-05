import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect, useRef } from "react";

import AdminDashboard from "@/pages/AdminDashboard";
import NewContest from "@/pages/NewContest";
import EditContest from "@/pages/EditContest";
import ContestManager from "@/pages/ContestManager";
import PublicBoard from "@/pages/PublicBoard";
import MyContests from "@/pages/MyContests";
import Hub from "@/pages/Hub";
import Join from "@/pages/Join";
import GolfSurvivor from "@/pages/golf-survivor";
import AdminGolfDashboard from "@/pages/golf/AdminGolfDashboard";
import NewGolfPool from "@/pages/golf/NewGolfPool";
import GolfPoolManager from "@/pages/golf/GolfPoolManager";
import GolfSurvivorPicks from "@/pages/golf/GolfSurvivorPicks";
import GolfPoolSignup from "@/pages/golf/GolfPoolSignup";
import NotFound from "@/pages/not-found";

function LoginRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    const loginUrl = returnTo ? `/api/login?returnTo=${encodeURIComponent(returnTo)}` : '/api/login';
    window.location.href = loginUrl;
  }, []);
  return <div className="flex items-center justify-center min-h-screen">
    <p className="text-muted-foreground">Redirecting to login...</p>
  </div>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();
  const currentPath = useRef(location);

  useEffect(() => {
    if (!location.startsWith('/login')) {
      currentPath.current = location;
    }
  }, [location]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation(`/login?returnTo=${encodeURIComponent(currentPath.current)}`);
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
      <Route path="/" component={Hub} />
      <Route path="/join" component={Join} />
      <Route path="/golfsurvivor" component={GolfSurvivor} />
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
      <Route path="/admin/golf">
        {() => <ProtectedRoute component={AdminGolfDashboard} />}
      </Route>
      <Route path="/admin/golf/pool/new">
        {() => <ProtectedRoute component={NewGolfPool} />}
      </Route>
      <Route path="/admin/golf/pool/:id">
        {() => <ProtectedRoute component={GolfPoolManager} />}
      </Route>
      <Route path="/golf/pool/:poolId/entry/:entryId" component={GolfSurvivorPicks} />
      <Route path="/golf/pool/:poolId/signup" component={GolfPoolSignup} />
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
