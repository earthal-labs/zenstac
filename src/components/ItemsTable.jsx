import { createMemo } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import { EmptyState } from "./EmptyState.jsx";
import { DataTable } from "./DataTable.jsx";
import { useSharedState } from "../pages/sharedState.jsx";
import { findThumbnailAsset } from "../services/api.js";

export const ItemsTable = ({ items, collections, isLoading, searchQuery, onRefresh, collectionFilter }) => {
  const { navigateToItem, state } = useSharedState();
  
  // Filtered items based on search query and collection filter
  const filteredItems = createMemo(() => {
    const currentItems = items();
    const currentSearchQuery = searchQuery();
    const currentCollectionFilter = collectionFilter();
    
    let filtered = currentItems;
    
    // Apply collection filter
    if (currentCollectionFilter) {
      filtered = filtered.filter(item => item.collection === currentCollectionFilter);
    }
    
    // Apply search query
    if (currentSearchQuery) {
      const query = currentSearchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.id.toLowerCase().includes(query) ||
        item.properties?.title?.toLowerCase().includes(query) ||
        item.properties?.description?.toLowerCase().includes(query) ||
        item.collection.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  });

  // DataTable columns definition
  const columns = [
    {
      key: 'thumbnail',
      label: '',
      width: '80px',
      thStyle: 'text-align: center;',
      render: (item) => {
        const thumbnailAsset = findThumbnailAsset(item);
        
        if (thumbnailAsset) {
          return (
            <div class="flex justify-center">
              <img 
                src={thumbnailAsset.href} 
                alt="Thumbnail"
                class="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div class="hidden w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-gray-600 items-center justify-center">
                <sl-icon name="image" class="text-gray-400"></sl-icon>
              </div>
            </div>
          );
        }
        
        return (
          <div class="flex justify-center">
            <div class="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center">
              <sl-icon name="file-earmark" class="text-gray-400"></sl-icon>
            </div>
          </div>
        );
      }
    },
    {
      key: 'title',
      label: 'Title',
      width: 'calc(100% - 200px)',
      render: (item) => (
        <div class="flex flex-col gap-2">
          <span class="font-semibold text-gray-900 dark:text-white text-base">
            {(item.properties?.title || item.id).length > 40
              ? (item.properties?.title || item.id).substring(0, 40) + "..."
              : (item.properties?.title || item.id)}
          </span>
          <div class="mt-1">
            <sl-badge
              variant="primary"
              pill
              class="text-xs font-medium px-2 py-0.5"
            >
              {item.collection.length > 25 ? item.collection.substring(0, 25) + "..." : item.collection}
            </sl-badge>
          </div>
        </div>
      )
    },
    {
      key: 'datetime',
      label: 'Date',
      width: '120px',
      thStyle: 'text-align: center;',
      render: (item) => (
        <div class="text-center text-gray-600 dark:text-gray-300 text-sm">
          {item.properties?.datetime
            ? new Date(item.properties.datetime).toLocaleDateString()
            : 'Unknown'}
        </div>
      )
    }
  ];

  return (
    <div class="w-full">
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Collection Filter Header */}
        {collectionFilter() && (
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <sl-icon name="collection" class="text-gray-600 dark:text-gray-300"></sl-icon>
              <span class="text-sm text-gray-600 dark:text-gray-300">
                Showing items from collection: <strong class="text-gray-900 dark:text-white">{collectionFilter()}</strong>
              </span>
            </div>
            <sl-button
              size="small"
              variant="default"
              onClick={() => state.setCollectionFilter('')}
              class="text-xs"
            >
              <sl-icon name="x-lg" slot="prefix"></sl-icon>
              Clear Filter
            </sl-button>
          </div>
        )}
        
        {isLoading() ? (
          <div class="flex items-center justify-center gap-3 p-10 text-gray-600 dark:text-gray-300 text-base">
            Loading items...
          </div>
        ) : (
          (() => {
            const items = filteredItems();
            if (!items || items.length === 0) {
              return (
                <EmptyState
                  icon="plus-circle"
                  title="Add Item"
                  description={searchQuery() ? 
                    "No items match your search criteria." : 
                    "Get started by adding your first STAC item."}
                />
              );
            }
            return (
              <DataTable
                columns={columns}
                data={items}
                loading={isLoading()}
                empty="No items found."
                onRowClick={(item) => { navigateToItem(item); }}
                className="data-table"
              />
            );
          })()
        )}
      </div>
    </div>
  );
}; 