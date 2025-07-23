import { createSignal, onMount } from 'solid-js';
import { CollectionsTable } from "../components/CollectionsTable.jsx";
import { AddCollectionDialog } from "../components/AddCollectionDialog.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { useSharedState } from "./sharedState.jsx";
import { stacApi } from "../services/api.js";

export const CollectionsPage = () => {
  const { state, refreshCollections, loadCollections, loadItems } = useSharedState();
  const [isAddCollectionDialogOpen, setIsAddCollectionDialogOpen] = createSignal(false);
  const [formError, setFormError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  
  // Load collections when page loads
  onMount(async () => {
    state.setSearchQuery('');
    
    // Load collections (will use cache if fresh)
    await loadCollections();
    
    // Load items to calculate item counts for collections
    // This ensures the item counts are available in the collections table
    await loadItems();
  });
  
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

  // Handle create collection
  const handleCreateCollection = async () => {
    const id = document.getElementById('collection-id')?.value?.trim();
    const title = document.getElementById('collection-title')?.value?.trim();
    const description = document.getElementById('collection-description')?.value?.trim();
    const license = document.getElementById('collection-license')?.value?.trim();
    
    if (!id || !title) {
      setFormError("Collection ID and Title are required.");
      return;
    }
    
    setIsSubmitting(true);
    setFormError("");
    
    try {
      const collectionData = {
        type: 'Collection',
        id: id,
        title: title,
        description: description || 'No description available',
        license: license || 'Unknown',
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
      if (refreshCollections) {
        refreshCollections();
      }
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

  // Action button for creating collections
  const actionButton = (
    <>
      <sl-icon-button
        name="plus-lg"
        label="Create Collection"
        size="small"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
        onClick={() => handleDialogToggle(true)}
      />
      <sl-icon-button
        name="arrow-clockwise"
        label="Refresh"
        size="small"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
        onClick={async () => {
          await refreshCollections();
          // Also refresh items to update item counts
          await loadItems();
        }}
      />
    </>
  );
  
  return (
    <PageLayout
      title="Collections"
      searchQuery={state.searchQuery}
      setSearchQuery={state.setSearchQuery}
      onRefresh={loadCollections}
      actionButton={actionButton}
      searchPlaceholder="Search collections..."
    >
      {/* Collections Table */}
      <CollectionsTable
        collections={state.collections}
        isLoading={state.loading}
        searchQuery={state.searchQuery}
        onRefresh={refreshCollections}
      />
      
      {/* Add Collection Dialog */}
      <AddCollectionDialog
        openState={[isAddCollectionDialogOpen, setIsAddCollectionDialogOpen]}
        onRequestClose={handleRequestClose}
        onSuccess={refreshCollections}
      />
    </PageLayout>
  );
}; 