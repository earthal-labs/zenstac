import { createSignal } from 'solid-js';
import { SearchPanel } from "../components/SearchPanel.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { useSharedState } from "./sharedState.jsx";

export const SearchPage = () => {
  const { state } = useSharedState();
  const [searchQuery, setSearchQuery] = createSignal('');
  
  return (
    <PageLayout
      title="Search Items"
      searchQuery={searchQuery()}
      setSearchQuery={setSearchQuery}
      onRefresh={() => {}}
      showSearch={false}
    >
      <SearchPanel
        collections={state.collections}
        onSearchResults={results => {
          state.currentView.set({ type: "searchResults", data: results });
          state.searchResults.set(results);
          state.forceUpdate.set(state.forceUpdate() + 1);
          window.history.pushState({}, '', '/search-results');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      />
    </PageLayout>
  );
}; 