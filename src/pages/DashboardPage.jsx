import { onMount, createSignal } from 'solid-js';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard.jsx';
import { PageLayout } from '../components/PageLayout.jsx';
import { useSharedState } from './sharedState.jsx';

export const DashboardPage = () => {
  const { state, refreshAnalytics, refreshCollections, refreshItems } = useSharedState();
  const [searchQuery, setSearchQuery] = createSignal('');

  onMount(async () => {
    await refreshCollections();
    await refreshItems();
    await refreshAnalytics();
  });

  return (
    <PageLayout
      title="Dashboard"
      searchQuery={searchQuery()}
      setSearchQuery={setSearchQuery}
      onRefresh={refreshAnalytics}
      showSearch={false}
    >
      <AnalyticsDashboard analytics={state.analytics} onRefresh={refreshAnalytics} />
    </PageLayout>
  );
}; 
