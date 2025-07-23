import { createSignal, createMemo } from 'solid-js';
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
import { stacApi } from "../services/api.js";
import { AddCollectionDialog } from "./AddCollectionDialog.jsx";

export const CollectionsTable = ({ collections, isLoading, searchQuery, onRefresh }) => {
  const { navigateToCollection } = useSharedState();
  
  // State for adding a new collection
  const [isAddCollectionDialogOpen, setIsAddCollectionDialogOpen] = createSignal(false);
  const [formError, setFormError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  
  // Handle dialog close request
  const handleRequestClose = (event) => {
    if (event.detail.source === 'overlay') {
      event.preventDefault();
    }
  };

  // Clear form error when dialog opens/closes
  const handleDialogToggle = (open) => {
    setIsAddCollectionDialogOpen(open);
    if (open) {
      setFormError("");
    }
  };

  // Filtered collections based on search query
  const filteredCollections = createMemo(() => {
    const currentCollections = collections();
    const currentSearchQuery = searchQuery();
    
    const query = currentSearchQuery.toLowerCase();
    if (!query) return currentCollections;
    
    const filtered = currentCollections.filter(collection => 
      collection.title.toLowerCase().includes(query) ||
      collection.description.toLowerCase().includes(query) ||
      collection.id.toLowerCase().includes(query)
    );
    
    return filtered;
  });

  // Handle form submission with better error handling
  const handleCreateCollection = async () => {
    const id = document.getElementById('collection-id')?.value?.trim();
    const title = document.getElementById('collection-title')?.value?.trim();
    const description = document.getElementById('collection-description')?.value?.trim();
    const license = document.getElementById('collection-license')?.value?.trim();
    
    // Clear previous errors
    setFormError("");
    
    // Validation
    if (!id) {
      setFormError("Collection ID is required");
      return;
    }
    if (!title) {
      setFormError("Collection title is required");
      return;
    }
    if (!description) {
      setFormError("Collection description is required");
      return;
    }
    if (!license) {
      setFormError("Collection license is required");
      return;
    }
    if (id.length < 3) {
      setFormError("Collection ID must be at least 3 characters long");
      return;
    }
    if (title.length < 3) {
      setFormError("Collection title must be at least 3 characters long");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const collectionData = {
        type: 'Collection',
        id: id,
        title: title,
        description: description,
        license: license,
        extent: {
          spatial: {
            bbox: [[-180, -90, 180, 90]]
          },
          temporal: {
            interval: [['1900-01-01T00:00:00Z', null]]
          }
        },
        links: [],
        summaries: {}
      };
      
      await stacApi.createCollection(collectionData);
      setIsAddCollectionDialogOpen(false);
      
      // Clear form
      document.getElementById('collection-id').value = '';
      document.getElementById('collection-title').value = '';
      document.getElementById('collection-description').value = '';
      document.getElementById('collection-license').value = '';
      
      // Refresh the data
      if (onRefresh) {
        onRefresh();
      }

      // Navigate to collections page after successful creation
      setTimeout(() => {
        window.location.hash = 'collections';
        setTimeout(() => {
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }, 100);
      }, 100);
    } catch (error) {
      if (error.message.includes('not implemented')) {
        setFormError('Collection creation is not supported by your STAC server. Your STAC server needs to implement the POST /collections endpoint.');
      } else {
        setFormError(`Failed to create collection: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // DataTable columns definition
  const columns = [
    {
      key: 'title',
      label: 'Title',
      width: '30%',
      render: (collection) => (
        <div class="flex flex-col gap-2">
          <span class="font-semibold text-gray-900 dark:text-white text-base">
            {collection.title.length > 40 ? collection.title.substring(0, 40) + "..." : collection.title}
          </span>
          <div class="mt-1">
            <sl-badge 
              variant="primary" 
              pill 
              class="text-xs font-medium px-2 py-0.5"
            >
              {collection.id.length > 25 ? collection.id.substring(0, 25) + "..." : collection.id}
            </sl-badge>
          </div>
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description',
      width: '50%',
      render: (collection) => (
        <div class="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
          {(collection.description || "No description available").length > 60 
            ? (collection.description || "No description available").substring(0, 60) + "..." 
            : (collection.description || "No description available")}
        </div>
      )
    },
    {
      key: 'itemCount',
      label: 'Items',
      width: '20%',
      thStyle: 'text-align: center;',
      render: (collection) => (
        <div class="text-center text-gray-600 dark:text-gray-300 text-base">
          {collection.itemCount || 0}
        </div>
      )
    }
  ];

  return (
    <div class="w-full">
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading() ? (
          <div class="flex items-center justify-center gap-3 p-10 text-gray-600 dark:text-gray-300 text-base">
            Loading collections...
          </div>
        ) : (
          (() => {
            const collections = filteredCollections();
            if (!collections || collections.length === 0) {
              const actionButton = (
                <sl-button 
                  variant="default" 
                  onClick={() => handleDialogToggle(true)}
                >
                  <sl-icon name="plus" slot="prefix"></sl-icon>
                  Add Collection
                </sl-button>
              );
              return (
                <div>
                  <EmptyState
                    icon="plus-circle"
                    title="Add Collection"
                    description={searchQuery() ? 
                      "No collections match your search criteria." : 
                      "Get started by adding your first STAC collection."}
                    actionButton={actionButton}
                  />
                  <AddCollectionDialog
                    openState={[isAddCollectionDialogOpen, setIsAddCollectionDialogOpen]}
                    onRequestClose={handleRequestClose}
                    onSuccess={onRefresh}
                  />
                </div>
              );
            }
            return (
              <DataTable
                columns={columns}
                data={collections}
                loading={isLoading()}
                empty="No collections found."
                onRowClick={(collection) => navigateToCollection(collection)}
                className="data-table"
              />
            );
          })()
        )}
      </div>
    </div>
  );
}; 