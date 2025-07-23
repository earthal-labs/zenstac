import { SearchResults } from "../components/SearchResults.jsx";
import { useSharedState } from "./sharedState.jsx";

export const SearchResultsPage = () => {
  const { state } = useSharedState();
  if (!state.searchResults() || state.searchResults().length === 0) {
    return (
      <div class="space-y-6">
        <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div class="flex flex-col items-center justify-center h-[400px] text-gray-500 dark:text-gray-400 text-center">
            <sl-icon name="search" style="font-size: 64px; color: var(--sl-color-neutral-400); margin-bottom: 16px;" />
            <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Search Results</h3>
            <p class="text-gray-500 dark:text-gray-400">Try adjusting your search parameters or browse all items.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div class="space-y-6">
      <SearchResults
        results={state.searchResults()}
        isLoading={state.loading}
        hasSearched={state.hasSearched}
        onBack={() => {
          window.history.pushState({}, '', '/search');
          window.dispatchEvent(new PopStateEvent('popstate'));
          state.searchResults.set([]);
          state.hasSearched.set(false);
          state.forceUpdate.set(state.forceUpdate() + 1);
        }}
      />
    </div>
  );
}; 