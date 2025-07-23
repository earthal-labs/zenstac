import { createMemo } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import { useSharedState } from '../pages/sharedState.jsx';
import { findThumbnailAsset } from '../services/api.js';

export const SearchResults = (props) => {
  const { navigateToItem } = useSharedState();
  const getResults = createMemo(() => {
    if (props.results && typeof props.results === 'object' && 'val' in props.results) {
      return props.results.val || [];
    }
    return props.results || [];
  });

  const handleCardClick = (item) => {
    navigateToItem(item);
  };

  return (
    <div class="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div class="flex items-center gap-3 sm:gap-4">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0">Search Results</h2>
          <sl-badge variant="primary" pill>{getResults().length} items found</sl-badge>
        </div>
        <div class="flex gap-2">
          <sl-icon-button
            name="arrow-left"
            label="Back to Search"
            onclick={props.onBack}
          />
        </div>
      </div>

      {/* Results Grid */}
      <div class="details-section mb-6 p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {getResults().map(result => {
            const item = result.item || result;
            const thumbnailAsset = findThumbnailAsset(item);
            const thumbnail = thumbnailAsset?.href;
            return (
              <div
                class="bg-gray-50 dark:bg-slate-700 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex flex-col h-full min-h-[220px]"
                onclick={() => handleCardClick(item)}
              >
                <div class="relative mb-3 sm:mb-4 flex-shrink-0 min-h-[100px] sm:min-h-[160px] flex items-center">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={item.title || item.id}
                      class="w-full h-32 sm:h-40 object-cover rounded-lg transition-transform duration-300 hover:scale-105 min-h-[100px] sm:min-h-[160px]"
                      onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                    />
                  ) : (
                    <div class="flex items-center justify-center w-full h-32 sm:h-40 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-600 dark:to-slate-700 rounded-lg min-h-[100px] sm:min-h-[160px]">
                      <sl-icon name="image" style="font-size: 32px; sm:font-size: 40px; color: var(--sl-color-neutral-400);" />
                    </div>
                  )}
                  <sl-badge
                    variant="primary"
                    pill
                    style="position: absolute; top: 8px; sm:top: 12px; left: 8px; sm:left: 12px; font-size: 10px; sm:font-size: 11px; font-weight: 600; text-transform: none; letter-spacing: 0;"
                  >
                    {item.collection}
                  </sl-badge>
                </div>
                <div class="flex flex-col flex-1 space-y-2 sm:space-y-3">
                  <h3 class="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2 flex-1">{result.title}</h3>
                  <div class="flex flex-row justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 flex-wrap gap-1 sm:gap-2 text-xs text-gray-500 dark:text-gray-400 mt-auto">
                    {result.date && (
                      <span class="flex items-center gap-1">
                        <sl-icon name="calendar" style="color: var(--sl-color-neutral-500);" />
                        {result.date}
                      </span>
                    )}
                    {result.cloudCover && (
                      <span class="flex items-center gap-1">
                        <sl-icon name="cloud" style="color: var(--sl-color-neutral-500);" />
                        {result.cloudCover}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}; 