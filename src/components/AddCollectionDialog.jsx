import { createSignal } from 'solid-js';
import { ShoelaceDialog } from "./ShoelaceDialog.jsx";
import { stacApi } from "../services/api.js";

export const AddCollectionDialog = ({ openState, onRequestClose, onSuccess }) => {
  const [isOpen, setIsOpen] = openState;
  const [formError, setFormError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

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
      setIsOpen(false);

      // Clear form
      document.getElementById('collection-id').value = '';
      document.getElementById('collection-title').value = '';
      document.getElementById('collection-description').value = '';
      document.getElementById('collection-license').value = '';

      // Refresh the data
      if (onSuccess) {
        onSuccess();
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

  return (
    <ShoelaceDialog
      openState={[isOpen, setIsOpen]}
      label="Add New Collection"
      onRequestClose={onRequestClose}
    >
      <div 
        class="space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex flex-col gap-1">
          <label for="collection-id" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Collection ID *</label>
          <sl-input
            id="collection-id"
            type="text"
            placeholder="e.g., monitoring-stations"
            clearable
            required
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="collection-title" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Title *</label>
          <sl-input
            id="collection-title"
            type="text"
            placeholder="e.g., Environmental Monitoring Stations"
            clearable
            required
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="collection-description" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description *</label>
          <sl-input
            id="collection-description"
            type="text"
            placeholder="A brief description of the collection"
            clearable
            required
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="collection-license" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">License *</label>
          <sl-input
            id="collection-license"
            type="text"
            placeholder="e.g., CC-BY-4.0"
            clearable
            required
          />
        </div>
        {formError() && (
          <div class="text-red-600 dark:text-red-400 mt-4 text-sm">
            {formError()}
          </div>
        )}
      </div>
      <div slot="footer" class="flex gap-2 justify-between">
        <sl-button
          variant="default"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </sl-button>
        <sl-button
          variant="primary"
          onClick={handleCreateCollection}
          disabled={isSubmitting()}
          loading={isSubmitting()}
        >
          {isSubmitting() ? "Creating..." : "Create Collection"}
        </sl-button>
      </div>
    </ShoelaceDialog>
  );
}; 