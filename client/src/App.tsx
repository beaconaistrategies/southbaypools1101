import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import NewContest from "@/pages/NewContest";
import EditContest from "@/pages/EditContest";
import ContestManager from "@/pages/ContestManager";
import PublicBoard from "@/pages/PublicBoard";
import MyContests from "@/pages/MyContests";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/contest/new" component={NewContest} />
      <Route path="/admin/contest/:id/edit" component={EditContest} />
      <Route path="/admin/contest/:id" component={ContestManager} />
      <Route path="/board/:id" component={PublicBoard} />
      <Route path="/my-contests" component={MyContests} />
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
