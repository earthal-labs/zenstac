import { createSignal, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { ShoelaceDialog } from "./ShoelaceDialog.jsx";
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

const removeButtonStyles = `
  .remove-button sl-icon-button::part(base) {
    color: #dc2626;
  }

  .remove-button sl-icon-button::part(base):hover,
  .remove-button sl-icon-button::part(base):focus {
    color: #ef4444;
  }

  .remove-button sl-icon-button::part(base):active {
    color: #b91c1c;
  }
`;

export const UploadAssetDialog = ({ openState, item, onRequestClose, onSuccess }) => {
  const [isOpen, setIsOpen] = openState;
  const [formError, setFormError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Assets to upload - array of {id, key, filePath, fileName} objects
  const [assetId, setAssetId] = createSignal(0);
  const [assetsToUpload, setAssetsToUpload] = createStore([]);
  
  const addAsset = () => {
    const nextId = assetId() + 1;
    setAssetId(nextId);
    setAssetsToUpload([...assetsToUpload, { id: nextId, key: '', filePath: null, fileName: null }]);
  };
  
  const removeAsset = (id) => setAssetsToUpload(assetsToUpload.filter((asset) => asset.id !== id));
  
  const updateAsset = (id, field, val) => {
    const idx = assetsToUpload.findIndex(a => a.id === id);
    if (idx !== -1) setAssetsToUpload(idx, field, val);
  };

  // Track if we've already reset state for this dialog session
  let hasResetState = false;
  
  // When dialog opens, reset all state (but only once per session)
  createEffect(() => {
    if (isOpen() && !hasResetState) {
  
      setFormError("");
      setAssetId(0);
      setAssetsToUpload([]);
      hasResetState = true;
    } else if (!isOpen()) {
      // Reset the flag when dialog closes
      hasResetState = false;
    }
  });

  // Pick a single file for individual asset rows
  const pickSingleFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Geospatial', extensions: ['tif', 'tiff', 'jpg', 'jpeg', 'png', 'shp', 'json', 'xml', 'zip'] }
      ]
    });
    return selected;
  };

  // Select file for a specific asset row
  const selectFileForAsset = async (id) => {
    const filePath = await pickSingleFile();
    if (filePath) {
      const fileName = filePath.split(/[/\\]/).pop();
      updateAsset(id, 'filePath', filePath);
      updateAsset(id, 'fileName', fileName);
      
      // Auto-guess asset key from file name if not already set
      const currentAsset = assetsToUpload.find(a => a.id === id);
      if (currentAsset && !currentAsset.key) {
        let key = 'data';
        const lowerName = fileName.toLowerCase();
        if (lowerName.includes('thumb') || lowerName.includes('preview') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) {
          key = 'thumbnail';
        } else if (lowerName.includes('overview') || lowerName.includes('over')) {
          key = 'overview';
        } else if (lowerName.includes('visual') || lowerName.includes('rgb')) {
          key = 'visual';
        } else if (lowerName.includes('nir') || lowerName.includes('near')) {
          key = 'nir';
        } else if (lowerName.includes('swir') || lowerName.includes('short')) {
          key = 'swir';
        } else if (lowerName.includes('thermal') || lowerName.includes('temp')) {
          key = 'thermal';
        } else if (lowerName.includes('metadata') || lowerName.includes('meta') || lowerName.endsWith('.json') || lowerName.endsWith('.xml')) {
          key = 'metadata';
        } else if (lowerName.endsWith('.tif') || lowerName.endsWith('.tiff')) {
          const bandMatch = fileName.match(/B(\d+)/i);
          if (bandMatch) {
            key = `data_band${bandMatch[1]}`;
          } else {
            key = `data_${fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
          }
        }
        updateAsset(id, 'key', key);
      }
    }
  };

  // Add multiple files at once
  const addAssetFiles = async () => {
    const files = await open({
      multiple: true,
      filters: [
        { name: 'Geospatial', extensions: ['tif', 'tiff', 'jpg', 'jpeg', 'png', 'shp', 'json', 'xml', 'zip'] }
      ]
    });
    
    if (files && files.length > 0) {
      files.forEach(filePath => {
        // Guess asset key from file name
        const fileName = filePath.split(/[/\\]/).pop();
        let key = 'data';
        const lowerName = fileName.toLowerCase();
        if (lowerName.includes('thumb') || lowerName.includes('preview') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) {
          key = 'thumbnail';
        } else if (lowerName.includes('overview') || lowerName.includes('over')) {
          key = 'overview';
        } else if (lowerName.includes('visual') || lowerName.includes('rgb')) {
          key = 'visual';
        } else if (lowerName.includes('nir') || lowerName.includes('near')) {
          key = 'nir';
        } else if (lowerName.includes('swir') || lowerName.includes('short')) {
          key = 'swir';
        } else if (lowerName.includes('thermal') || lowerName.includes('temp')) {
          key = 'thermal';
        } else if (lowerName.includes('metadata') || lowerName.includes('meta') || lowerName.endsWith('.json') || lowerName.endsWith('.xml')) {
          key = 'metadata';
        } else if (lowerName.endsWith('.tif') || lowerName.endsWith('.tiff')) {
          const bandMatch = fileName.match(/B(\d+)/i);
          if (bandMatch) {
            key = `data_band${bandMatch[1]}`;
          } else {
            key = `data_${fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
          }
        }
        const nextId = assetId() + 1;
        setAssetId(nextId);
        setAssetsToUpload([...assetsToUpload, { id: nextId, key, filePath, fileName }]);
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (assetsToUpload.length === 0) {
      setFormError("Please add at least one asset to upload.");
      return;
    }

    // Validate that all assets have both key and file
    const invalidAssets = assetsToUpload.filter(asset => !asset.key || !asset.filePath);
    if (invalidAssets.length > 0) {
      setFormError("All assets must have both a key and a file selected.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    
    try {
      // Upload each asset using Tauri
      for (const asset of assetsToUpload) {
        if (asset.key && asset.filePath) {
          await invoke('copy_asset_file', {
            srcPath: asset.filePath,
            collectionId: item.collection,
            itemId: item.id,
            assetKey: asset.key
          });
        }
      }
      
      setIsOpen(false);
      if (onSuccess) await onSuccess();
    } catch (error) {
      setFormError(`Failed to upload assets: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ShoelaceDialog
      openState={[isOpen, setIsOpen]}
      label="Upload Assets"
      onRequestClose={onRequestClose}
      style={{ minWidth: '700px', maxWidth: '900px' }}
    >
      <style>{removeButtonStyles}</style>
      <form id="upload-asset-form" onSubmit={handleSubmit} class="space-y-4 pr-2 px-4">
        <div class="mb-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Upload assets for item <strong>{item?.id}</strong> in collection <strong>{item?.collection}</strong>
          </p>
        </div>

        {/* Assets Section */}
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Assets</label>
          <div class="space-y-2 max-h-[300px] overflow-y-auto rounded bg-white/80 dark:bg-slate-700/80 p-3 mb-2">
            {assetsToUpload.length > 0 ? (
              assetsToUpload.map((asset) => (
                <div class="flex gap-2 items-center" key={asset.id}>
                  <sl-input
                    placeholder="Asset Key (e.g., data, thumbnail, data_band1)"
                    class="w-1/3"
                    value={asset.key}
                    onInput={e => updateAsset(asset.id, 'key', e.target.value)}
                  />
                  <div class="flex items-center gap-2 flex-1">
                    <sl-button
                      type="button"
                      size="small"
                      variant="default"
                      onClick={() => selectFileForAsset(asset.id)}
                    >
                      {asset.fileName ? "Change File" : "Choose File"}
                    </sl-button>
                    <span class="text-xs text-gray-400 truncate" style="max-width: 120px;">
                      {asset.fileName || "No file chosen"}
                    </span>
                  </div>
                  <sl-icon-button
                    type="button"
                    size="small"
                    name="trash3"
                    label="Remove Asset"
                    onClick={() => removeAsset(asset.id)}
                  />
                </div>
              ))
            ) : (
              <div class="text-gray-500 dark:text-gray-400 text-sm">No assets added yet</div>
            )}
          </div>
          
          <div class="flex gap-2">
            <sl-icon-button
              type="button"
              variant="primary"
              size="small"
              name="plus"
              label="Add Asset"
              onClick={addAsset}
            />
            <sl-icon-button
              type="button"
              variant="default"
              size="small"
              name="cloud-upload"
              label="Add Files (Tauri)"
              onClick={addAssetFiles}
            />
          </div>
        </div>

        {formError() && (
          <div class="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {formError()}
          </div>
        )}

        <div class="flex justify-between gap-3 pt-4">
          <sl-button
            type="button"
            variant="default"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting()}
          >
            Cancel
          </sl-button>
          <sl-button
            type="submit"
            variant="primary"
            loading={isSubmitting()}
            disabled={isSubmitting()}
          >
            Upload Assets
          </sl-button>
        </div>
      </form>
    </ShoelaceDialog>
  );
}; 