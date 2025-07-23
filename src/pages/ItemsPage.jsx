import { createSignal, onMount } from 'solid-js';
import { ItemsTable } from "../components/ItemsTable.jsx";
import { AddItemDialog } from "../components/AddItemDialog.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { useSharedState } from "./sharedState.jsx";

export const ItemsPage = () => {
  const { state, refreshItems, loadItems, loadCollections } = useSharedState();
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = createSignal(false);
  
  // Load items when page loads
  onMount(async () => {

    state.setItemsSearchQuery('');
    

    
    // First ensure collections are loaded, then load items
    if (state.collections().length === 0) {
  
      await loadCollections();
    }
    
    // Load items (will use cache if fresh)

    loadItems();
  });
  
  // Handle dialog close request
  const handleRequestClose = (event) => {
    if (event.detail.source === 'overlay') {
      event.preventDefault();
    }
  };

  // Clear form error when dialog opens/closes
  const handleDialogToggle = (open) => {
    setIsAddItemDialogOpen(open);
  };



  // Action button for creating items
  const actionButton = (
    <>
      <sl-icon-button
        name="plus-lg"
        label="Create Item"
        size="small"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
        onClick={() => handleDialogToggle(true)}
        disabled={state.collections().length === 0}
      />
      <sl-icon-button
        name="arrow-clockwise"
        label="Refresh"
        size="small"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
        onClick={() => {
          // Clear collection filter on refresh
          state.setCollectionFilter('');
          refreshItems();
        }}
      />
    </>
  );
  
  return (
    <PageLayout
      title="Items"
      searchQuery={state.itemsSearchQuery}
      setSearchQuery={state.setItemsSearchQuery}
      onRefresh={loadItems}
      actionButton={actionButton}
      searchPlaceholder="Search items..."
    >
      {/* Items Table */}
      <ItemsTable
        items={state.items}
        collections={state.collections}
        isLoading={state.loading}
        searchQuery={state.itemsSearchQuery}
        onRefresh={refreshItems}
        collectionFilter={state.collectionFilter}
      />
      
      {/* Add Item Dialog */}
      <AddItemDialog
        openState={[isAddItemDialogOpen, setIsAddItemDialogOpen]}
        collections={state.collections}
        onRequestClose={handleRequestClose}
        onSuccess={() => {
      
          refreshItems();
        }}
      />
    </PageLayout>
  );
}; 