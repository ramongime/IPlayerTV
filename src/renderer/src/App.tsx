import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '@/pages/DashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>
  );
}
