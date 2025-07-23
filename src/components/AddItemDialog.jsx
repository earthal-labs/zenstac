import { createSignal, createEffect, For, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { ShoelaceDialog } from "./ShoelaceDialog.jsx";
import { LeafletMap } from './LeafletMap.jsx';
import { onCleanup } from 'solid-js';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export const AddItemDialog = ({ openState, collections, onRequestClose, onSuccess }) => {
  const [isOpen, setIsOpen] = openState;
  const [formError, setFormError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Form state for all fields - using DOM approach like AddCollectionDialog

  // Dynamic Properties
  const [propertyId, setPropertyId] = createSignal(0);
  const [properties, setProperties] = createStore([{ id: 0, key: '', value: '' }]);
  const addProperty = () => {
    const nextId = propertyId() + 1;
    setPropertyId(nextId);
    setProperties(p => [...p, { id: nextId, key: '', value: '' }]);
  };
  const removeProperty = (id) => setProperties(p => p.filter((prop) => prop.id !== id));
  const updateProperty = (id, field, val) => {
    const idx = properties.findIndex(p => p.id === id);
    if (idx !== -1) setProperties(idx, field, val);
  };

  // Assets to upload - array of {id, key, file} objects
  const [assetId, setAssetId] = createSignal(0);
  const [assetsToUpload, setAssetsToUpload] = createStore([]);
  
  const addAsset = () => {
    const nextId = assetId() + 1;
    setAssetId(nextId);
    setAssetsToUpload([...assetsToUpload, { id: nextId, key: '', file: null }]);
  };
  
  const removeAsset = (id) => setAssetsToUpload(assetsToUpload.filter((asset) => asset.id !== id));
  
  const updateAsset = (id, field, val) => {
    const idx = assetsToUpload.findIndex(a => a.id === id);
    if (idx !== -1) setAssetsToUpload(idx, field, val);
  };

  // Geometry
  const [geometry, setGeometry] = createSignal(null);

  // Multi-step state
  const [step, setStep] = createSignal(1);

  let collectionSelectRef;
  let assetSelectRefs = [];
  let assetFileRefs = [];

  // Form state using signals (like SettingsDialog)
  const [itemId, setItemId] = createSignal("");
  const [itemCollection, setItemCollection] = createSignal("");
  const [itemDatetime, setItemDatetime] = createSignal("");

  // Set up event listeners for Shoelace components when dialog opens
  createEffect(() => {
    if (isOpen()) {
      // Wait for DOM to be ready
      setTimeout(() => {
        const itemIdInput = document.getElementById('item-id');
        const itemCollectionSelect = document.getElementById('item-collection');
        const itemDatetimeInput = document.getElementById('item-datetime');
        
        if (itemIdInput) {
          const handleItemIdChange = (e) => {
            setItemId(e.target.value);
          };
          itemIdInput.addEventListener('sl-input', handleItemIdChange);
          
          // Store handler for cleanup
          itemIdInput._itemIdHandler = handleItemIdChange;
        }
        
        if (itemCollectionSelect) {
          const handleItemCollectionChange = (e) => {
            setItemCollection(e.target.value);
          };
          itemCollectionSelect.addEventListener('sl-change', handleItemCollectionChange);
          
          // Store handler for cleanup
          itemCollectionSelect._itemCollectionHandler = handleItemCollectionChange;
        }
        
        if (itemDatetimeInput) {
          const handleItemDatetimeChange = (e) => {
            setItemDatetime(e.target.value);
          };
          itemDatetimeInput.addEventListener('sl-input', handleItemDatetimeChange);
          
          // Store handler for cleanup
          itemDatetimeInput._itemDatetimeHandler = handleItemDatetimeChange;
        }
      }, 50);
    }
  });

  // Reset form when dialog opens
  createEffect(() => {
    if (isOpen()) {
      console.log('Dialog opened - resetting form');
      setFormError("");
      setItemId("");
      setItemCollection("");
      setItemDatetime("");
      setPropertyId(0);
      setProperties([{ id: 0, key: '', value: '' }]);
      setAssetId(0);
      setAssetsToUpload([]);
      setGeometry(null);
      setStep(1);
      console.log('Form reset complete');
    }
  });

  // No longer needed - using DOM approach instead of signals

  // Set up event listeners for asset components when they're added
  const setupAssetEventListeners = () => {
    setTimeout(() => {
      // Set up event listeners for asset file inputs (asset key inputs are handled inline)
      assetFileRefs.forEach((ref, index) => {
        if (ref && !ref.hasAttribute('data-listener-attached')) {
      
          const handler = (e) => {
            const file = e.target.files[0];
        
            if (file) {
              setAssetsToUpload(prev => {
                const newAssets = [...prev];
                newAssets[index] = { ...newAssets[index], file };
            
                return newAssets;
              });
            }
          };
          ref.addEventListener('change', handler);
          ref.setAttribute('data-listener-attached', 'true');
          
          // Store the handler for cleanup
          ref._assetFileHandler = handler;
        }
      });
    }, 0);
  };

  // Call setupAssetEventListeners whenever assets change
  // createEffect(() => {
  //   const assets = assetsToUpload();
  //   if (assets.length > 0) {
  //     setupAssetEventListeners();
  //   }
  // });

  // Replace file input with Tauri file picker
  const pickFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [
        { name: 'Geospatial', extensions: ['tif', 'tiff', 'jpg', 'jpeg', 'png', 'shp', 'json', 'xml', 'zip'] }
      ]
    });
    return Array.isArray(selected) ? selected : (selected ? [selected] : []);
  };

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

  // In the asset list, show fileName and allow editing key
  const addAssetFiles = async () => {
    const files = await pickFiles();
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
  };

  // Select file for a specific asset row
  const selectFileForAsset = async (id) => {
    const filePath = await pickSingleFile();
    if (filePath) {
      const fileName = filePath.split(/[/\\]/).pop();
      updateAsset(id, 'filePath', filePath);
      updateAsset(id, 'fileName', fileName);
    }
  };

  // In the asset list, show fileName and allow editing key
  // On submit, call invoke('copy_asset_file', ...) for each asset
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const id = itemId().trim();
    const collection = itemCollection().trim();
    const datetime = itemDatetime().trim();
    
    console.log('Form submission - current values:', { id, collection, datetime });
    
    if (!id || !collection || !datetime) {
      console.log('Validation failed - missing required fields');
      setFormError("Item ID, Collection, and Date/Time are required.");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    const currentAssets = assetsToUpload;
    try {
      // Build properties object
      const propsObj = { datetime };
      properties.forEach(({ key, value }) => {
        if (key) propsObj[key] = value;
      });
      // Create the item first (without assets)
      const { stacApi } = await import("../services/api.js");
      const itemData = {
        type: 'Feature',
        id,
        collection,
        geometry: geometry() || {
          type: 'Polygon',
          coordinates: [[
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
            [-180, -90]
          ]]
        },
        bbox: [-180, -90, 180, 90],
        properties: propsObj,
        assets: {},
        links: []
      };
      await stacApi.createItem(collection, itemData);
      // Now copy each asset file using Tauri
      for (const { key, filePath } of currentAssets) {
        if (key && filePath) {
          await invoke('copy_asset_file', {
            srcPath: filePath,
            collectionId: collection,
            itemId: id,
            assetKey: key
          });
        }
      }
      console.log('Item created successfully, closing dialog');
      
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      setFormError(`Failed to create item: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ShoelaceDialog
      openState={[isOpen, setIsOpen]}
      label="Add New STAC Item"
      onRequestClose={onRequestClose}
      style={{ minWidth: '700px', maxWidth: '900px' }}
    >
      <form id="add-item-form" onSubmit={handleSubmit} class="space-y-4 pr-2 px-4">
        {step() === 1 && (
          <>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="item-id" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Item ID *
                </label>
                <sl-input
                  id="item-id"
                  name="item-id"
                  type="text"
                  required
                  placeholder="Enter unique item ID"
                  value={itemId()}
                  clearable
                />
              </div>
              <div>
                <label for="item-collection" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Collection *
                </label>
                <sl-select
                  ref={el => (collectionSelectRef = el)}
                  id="item-collection"
                  name="item-collection"
                  required
                  placeholder="Select collection"
                  value={itemCollection()}
                >
                  {collections().map(collection => (
                    <sl-option value={collection.id}>{collection.title}</sl-option>
                  ))}
                </sl-select>
              </div>
            </div>
            <div>
              <label for="item-datetime" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Date/Time *
              </label>
              <sl-input
                id="item-datetime"
                name="item-datetime"
                type="datetime-local"
                required
                value={itemDatetime()}
              />
            </div>
            {/* Properties Section */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Properties</label>
              <div class="space-y-2 max-h-[120px] overflow-y-auto rounded bg-white/80 dark:bg-slate-700/80 p-3 mb-2">
                <For each={properties}>{(prop) => (
                  <div class="flex gap-2 items-center" key={prop.id}>
                    <sl-input
                      type="text"
                      placeholder="Key"
                      class="w-1/3"
                      value={prop.key}
                      onInput={e => updateProperty(prop.id, 'key', e.target.value)}
                    />
                    <sl-input
                      type="text"
                      placeholder="Value"
                      class="w-1/2"
                      value={prop.value}
                      onInput={e => updateProperty(prop.id, 'value', e.target.value)}
                    />
                    <div class="remove-button">
                      <sl-icon-button
                        type="button"
                        size="small"
                        name="trash3"
                        label="Remove Property"
                        onClick={() => removeProperty(prop.id)}
                      />
                    </div>
                  </div>
                )}</For>
              </div>
              <sl-icon-button
                type="button"
                variant="primary"
                size="small"
                name="plus"
                label="Add Property"
                onClick={addProperty}
              />
            </div>
            {/* Assets Section */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Assets</label>
              <div class="space-y-2 max-h-[120px] overflow-y-auto rounded bg-white/80 dark:bg-slate-700/80 p-3 mb-2">
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
                          {asset.fileName || asset.filePath || "No file chosen"}
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
          </>
        )}
        {step() === 2 && (
          <>
            {/* Hidden required fields for form validation and submission */}
            <input type="hidden" name="item-id" value={itemId()} required />
            <input type="hidden" name="item-collection" value={itemCollection()} required />
            <input type="hidden" name="item-datetime" value={itemDatetime()} required />
            {/* Geometry Section */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Geometry</label>
              <LeafletMap onGeometryChange={geom => setGeometry(geom)} key={step()} fullscreen mapHeight={400} />
            </div>
          </>
        )}
        {formError() && (
          <div class="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded">
            {formError()}
          </div>
        )}
        <div class="flex justify-between gap-3 pt-4">
          <sl-button
            type="button"
            variant="default"
            onClick={() => step() === 1 ? setIsOpen(false) : setStep(step() - 1)}
            disabled={isSubmitting()}
          >
            {step() === 1 ? 'Cancel' : 'Back'}
          </sl-button>
          {step() === 1 && (
            <sl-button
              type="button"
              variant="primary"
              onClick={() => {
                // Validate required fields before proceeding
                const id = itemId().trim();
                const collection = itemCollection().trim();
                const datetime = itemDatetime().trim();
                
                if (!id || !collection || !datetime) {
                  setFormError("Item ID, Collection, and Date/Time are required.");
                  return;
                }
                setFormError(""); // Clear any previous errors
                setStep(2);
              }}
            >
              Next
            </sl-button>
          )}
          {step() === 2 && (
            <sl-button
              type="submit"
              variant="primary"
              loading={isSubmitting()}
              disabled={isSubmitting()}
            >
              Create Item
            </sl-button>
          )}
        </div>
      </form>
    </ShoelaceDialog>
  );
}; 