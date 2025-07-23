import { createSignal, createMemo, createEffect } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import { LeafletMap } from './LeafletMap.jsx';

import { ShoelaceDialog } from './ShoelaceDialog.jsx';
import { UploadAssetDialog } from './UploadAssetDialog.jsx';
import { stacApi } from '../services/api.js';

export const ItemDetails = (props) => {
  const { item, onBack, onUpdate } = props;
  if (!item) return <div class="p-4 text-gray-500">No item selected.</div>;

  // Local state for the current item that can be updated
  const [currentItem, setCurrentItem] = createSignal(item);
  
  // Update currentItem when the item prop changes
  createEffect(() => {
    setCurrentItem(item);
  });

  const [isEditing, setIsEditing] = createSignal(false);
  const [editedItem, setEditedItem] = createSignal({ ...item });
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [showBboxEditor, setShowBboxEditor] = createSignal(false);
  const [showGeometryEditor, setShowGeometryEditor] = createSignal(false);
  const [showAssetsEditor, setShowAssetsEditor] = createSignal(false);
  const [showPropertiesEditor, setShowPropertiesEditor] = createSignal(false);
  const [showUploadAssetDialog, setShowUploadAssetDialog] = createSignal(false);
  
  // Temporary state for dialog editing
  const [tempBboxData, setTempBboxData] = createSignal('');
  const [tempGeometryData, setTempGeometryData] = createSignal('');
  const [tempAssetsData, setTempAssetsData] = createSignal('');
  const [tempPropertiesData, setTempPropertiesData] = createSignal('');

  const formatDate = (datetime) => {
    if (!datetime) return 'Unknown';
    try {
      return new Date(datetime).toLocaleString();
    } catch {
      return datetime;
    }
  };

  const formatBbox = (bbox) => {
    if (!bbox || !Array.isArray(bbox)) return 'N/A';
    return bbox.map(v => v.toFixed(6)).join(', ');
  };

  const formatCoordinates = (geometry) => {
    if (!geometry) return 'N/A';
    try {
      return JSON.stringify(geometry.coordinates);
    } catch {
      return 'N/A';
    }
  };

  // Helper function to check if a property value is meaningful
  const hasMeaningfulValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && (value.trim() === '' || value === 'Unknown' || value === 'N/A')) return false;
    if (typeof value === 'number' && isNaN(value)) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  };

  // Helper function to get meaningful properties
  const getMeaningfulProperties = (properties) => {
    if (!properties || typeof properties !== 'object') return {};
    
    const meaningfulProps = {};
    Object.entries(properties).forEach(([key, value]) => {
      if (hasMeaningfulValue(value)) {
        meaningfulProps[key] = value;
      }
    });
    
    return meaningfulProps;
  };

  const handleEdit = () => {
    setEditedItem({ ...currentItem() });
    setIsEditing(true);
  };
  const handleCancel = () => {
    setIsEditing(false);
    setEditedItem({ ...currentItem() });
  };
  const handleFieldChange = (key, value) => {
    setEditedItem(ei => ({ ...ei, [key]: value }));
  };
  const handleJsonChange = (key, value) => {
    setEditedItem(ei => ({ ...ei, [key]: value }));
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = buildValidItemPayload(editedItem());
      await stacApi.putItem(currentItem().collection, currentItem().id, payload);
      setIsEditing(false);
      await refreshItemData();
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await stacApi.deleteItem(currentItem().collection, currentItem().id);
      setShowDeleteDialog(false);
      if (onBack) onBack();
      if (onUpdate) await onUpdate();
    } catch (e) {
      console.error('Failed to delete:', e);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleExploreCollection = () => {
    window.history.pushState({}, '', `/collections/${item.collection}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Function to refresh the current item data
  const refreshItemData = async () => {
    try {
      const refreshedItem = await stacApi.getItem(item.collection, item.id);
      setCurrentItem(refreshedItem);
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('Failed to refresh item data:', error);
    }
  };

  const openBboxEditor = () => {
    setTempBboxData(JSON.stringify(ei().bbox || [], null, 2));
    setShowBboxEditor(true);
  };

  const openGeometryEditor = () => {
    setTempGeometryData(JSON.stringify(ei().geometry || null, null, 2));
    setShowGeometryEditor(true);
  };

  const openAssetsEditor = () => {
    setTempAssetsData(JSON.stringify(ei().assets || {}, null, 2));
    setShowAssetsEditor(true);
  };

  const openPropertiesEditor = () => {
    setTempPropertiesData(JSON.stringify(ei().properties || {}, null, 2));
    setShowPropertiesEditor(true);
  };

  const saveBboxChanges = () => {
    try {
      const parsed = JSON.parse(tempBboxData());
      handleFieldChange('bbox', parsed);
      setShowBboxEditor(false);
    } catch (error) {
      console.error('Invalid JSON format for BBox:', error);
    }
  };

  const saveGeometryChanges = () => {
    try {
      const parsed = JSON.parse(tempGeometryData());
      handleFieldChange('geometry', parsed);
      setShowGeometryEditor(false);
    } catch (error) {
      console.error('Invalid JSON format for Geometry:', error);
    }
  };

  const saveAssetsChanges = () => {
    try {
      const parsed = JSON.parse(tempAssetsData());
      handleFieldChange('assets', parsed);
      setShowAssetsEditor(false);
    } catch (error) {
      console.error('Invalid JSON format for Assets:', error);
    }
  };

  const savePropertiesChanges = () => {
    try {
      const parsed = JSON.parse(tempPropertiesData());
      handleJsonChange('properties', parsed);
      setShowPropertiesEditor(false);
    } catch (error) {
      console.error('Invalid JSON format for Properties:', error);
    }
  };

  function buildValidItemPayload(ei) {
    // Use the original item as a base and only update the changed fields
    const baseItem = currentItem();
    
    // Build the payload with all required STAC Item fields
    const payload = {
      type: "Feature",
      stac_version: baseItem.stac_version || "1.0.0",
      stac_extensions: baseItem.stac_extensions || [],
      id: ei.id,
      collection: ei.collection,
      geometry: ei.geometry,
      bbox: ei.bbox,
      properties: ei.properties || {},
      links: baseItem.links || [],
      assets: ei.assets || {}
    };

    return payload;
  }

  const ei = createMemo(() => isEditing() ? editedItem() : currentItem());

  return (
    <div class="space-y-6">
      {/* Header with actions */}
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <sl-icon name="file-earmark" style="color: var(--sl-color-primary-600); font-size: 2rem;" />
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-0">{ei().title || ei().properties?.title || ei().id}</h2>
          <sl-badge variant="primary" pill>{ei().collection}</sl-badge>
        </div>
        <div class="flex gap-2">
          {onBack && (
            <sl-icon-button name="arrow-left" label="Back to Items" onclick={onBack} />
          )}
          <sl-icon-button name="collection" label="Explore Collection" onclick={handleExploreCollection} />
          {!isEditing() ? (
            <>
              <sl-icon-button name="pencil" label="Edit" onclick={handleEdit} />
              <sl-icon-button name="trash3" label="Delete" onclick={() => setShowDeleteDialog(true)} />
            </>
          ) : (
            <>
              <sl-icon-button name="x-lg" label="Cancel" onclick={handleCancel} />
              <sl-icon-button name="floppy" label="Save" loading={isSaving()} onclick={handleSave} />
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ShoelaceDialog
        openState={[showDeleteDialog, setShowDeleteDialog]}
        label="Delete Item?"
        class="max-w-md"
      >
        <div class="p-4">
          <p class="dark:text-white">Are you sure you want to delete this item?</p>
        </div>
        <div slot="footer" class="flex gap-2 justify-end">
          <sl-button variant="default" onClick={() => setShowDeleteDialog(false)}>Cancel</sl-button>
          <sl-button variant="danger" loading={isDeleting()} onClick={handleDelete}>Delete</sl-button>
        </div>
      </ShoelaceDialog>

      {/* BBox Editor Dialog */}
      <ShoelaceDialog
        openState={[showBboxEditor, setShowBboxEditor]}
        label="Edit BBox (Spatial Extent)"
        class="max-w-2xl"
      >
        <div class="p-4">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Edit the bounding box coordinates. Format: [west, south, east, north]</p>
          <sl-textarea
            value={tempBboxData()}
            onInput={(e) => setTempBboxData(e.target.value)}
            rows={8}
            placeholder="Enter BBox array..."
          />
        </div>
        <div slot="footer" class="flex gap-2 justify-end">
          <sl-button variant="default" onClick={() => setShowBboxEditor(false)}>Cancel</sl-button>
          <sl-button variant="primary" onClick={saveBboxChanges}>Save Changes</sl-button>
        </div>
      </ShoelaceDialog>

      {/* Geometry Editor Dialog */}
      <ShoelaceDialog
        openState={[showGeometryEditor, setShowGeometryEditor]}
        label="Edit Geometry"
        class="max-w-2xl"
      >
        <div class="p-4">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Edit the geometry coordinates. Format: GeoJSON geometry object</p>
          <sl-textarea
            value={tempGeometryData()}
            onInput={(e) => setTempGeometryData(e.target.value)}
            rows={12}
            placeholder="Enter geometry JSON..."
          />
        </div>
        <div slot="footer" class="flex gap-2 justify-end">
          <sl-button variant="default" onClick={() => setShowGeometryEditor(false)}>Cancel</sl-button>
          <sl-button variant="primary" onClick={saveGeometryChanges}>Save Changes</sl-button>
        </div>
      </ShoelaceDialog>

      {/* Assets Editor Dialog */}
      <ShoelaceDialog
        openState={[showAssetsEditor, setShowAssetsEditor]}
        label="Edit Assets"
        class="max-w-2xl"
      >
        <div class="p-4">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Edit the assets. Format: JSON object with asset definitions</p>
          <sl-textarea
            value={tempAssetsData()}
            onInput={(e) => setTempAssetsData(e.target.value)}
            rows={16}
            placeholder="Enter assets JSON..."
          />
        </div>
        <div slot="footer" class="flex gap-2 justify-end">
          <sl-button variant="default" onClick={() => setShowAssetsEditor(false)}>Cancel</sl-button>
          <sl-button variant="primary" onClick={saveAssetsChanges}>Save Changes</sl-button>
        </div>
      </ShoelaceDialog>

      {/* Properties Editor Dialog */}
      <ShoelaceDialog
        openState={[showPropertiesEditor, setShowPropertiesEditor]}
        label="Edit Properties"
        class="max-w-2xl"
      >
        <div class="p-4">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Edit the properties. Format: JSON object with property definitions</p>
          <sl-textarea
            value={tempPropertiesData()}
            onInput={(e) => setTempPropertiesData(e.target.value)}
            rows={16}
            placeholder="Enter properties JSON..."
          />
        </div>
        <div slot="footer" class="flex gap-2 justify-end">
          <sl-button variant="default" onClick={() => setShowPropertiesEditor(false)}>Cancel</sl-button>
          <sl-button variant="primary" onClick={savePropertiesChanges}>Save Changes</sl-button>
        </div>
      </ShoelaceDialog>

      {/* Map Preview Section */}
      {(ei().geometry || ei().bbox) && (
        <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <LeafletMap geometry={ei().geometry} bbox={ei().bbox} id={`item-details-map-${ei().id}`} />
        </div>
      )}

      {/* Basic Info Section */}
      <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-4 dark:text-white">Basic Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Item ID */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Item ID</div>
            {isEditing() ? (
              <sl-input
                value={ei().id}
                onInput={(e) => handleFieldChange('id', e.target.value)}
                size="small"
              />
            ) : (
              <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ei().id}</div>
            )}
          </div>

          {/* Collection */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Collection</div>
            {isEditing() ? (
              <sl-input
                value={ei().collection}
                onInput={(e) => handleFieldChange('collection', e.target.value)}
                size="small"
              />
            ) : (
              <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ei().collection}</div>
            )}
          </div>

          {/* Date */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Date</div>
            {isEditing() ? (
              <sl-input
                type="datetime-local"
                value={(() => {
                  const datetime = ei().properties?.datetime;
                  if (!datetime) return '';
                  try {
                    const date = new Date(datetime);
                    return date.toISOString().slice(0, 16);
                  } catch {
                    return '';
                  }
                })()}
                onInput={(e) => handleFieldChange('properties', { ...ei().properties, datetime: e.target.value })}
                size="small"
              />
            ) : (
              <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{formatDate(ei().properties?.datetime)}</div>
            )}
          </div>

          {/* BBox */}
          <div 
            class={`bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col ${isEditing() ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors' : ''}`}
            onclick={() => {
              if (isEditing()) {
                openBboxEditor();
              }
            }}
          >
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">BBox</div>
            <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{formatBbox(ei().bbox)}</div>
            {isEditing() && (
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to edit spatial extent</div>
            )}
          </div>

          {/* Geometry */}
          <div 
            class={`bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col ${isEditing() ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors' : ''}`}
            onclick={() => {
              if (isEditing()) {
                openGeometryEditor();
              }
            }}
          >
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Geometry</div>
            <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{formatCoordinates(ei().geometry)}</div>
            {isEditing() && (
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to edit geometry</div>
            )}
          </div>
        </div>
      </div>

      {/* Properties Section */}
      <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-4 dark:text-white">Properties</h3>
        {isEditing() ? (
          <div 
            class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            onclick={openPropertiesEditor}
          >
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Properties</div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              {(() => {
                const meaningfulProps = getMeaningfulProperties(ei().properties);
                return Object.keys(meaningfulProps).length > 0 
                  ? `${Object.keys(meaningfulProps).length} meaningful property(ies)`
                  : 'No meaningful properties'
              })()}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to edit properties</div>
          </div>
        ) : (() => {
          const meaningfulProps = getMeaningfulProperties(ei().properties);
          return Object.keys(meaningfulProps).length > 0 ? (
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(meaningfulProps).map(([key, value]) => (
              <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
                <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">{key}</div>
                <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </div>
              </div>
            ))}
            </div>
          ) : (
            <div class="text-gray-500 dark:text-gray-400">No meaningful properties</div>
          );
        })()}
      </div>

      {/* Assets Section */}
      <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold dark:text-white">Assets</h3>
          {!isEditing() && (
            <sl-button
              variant="default"
              size="small"
              onClick={() => setShowUploadAssetDialog(true)}
            >
              <sl-icon slot="prefix" name="image"></sl-icon>
              Upload Asset
            </sl-button>
          )}
        </div>
        
        {isEditing() ? (
          <div 
            class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            onclick={openAssetsEditor}
          >
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Assets</div>
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              {ei().assets && Object.keys(ei().assets).length > 0 
                ? `${Object.keys(ei().assets).length} asset(s) configured`
                : 'No assets configured'
              }
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to edit assets</div>
          </div>
        ) : ei().assets && Object.keys(ei().assets).length > 0 ? (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ei().assets).map(([name, asset]) => (
              <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-start mb-2">
                  <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{name}</div>
                  {asset.roles && asset.roles.length > 0 && (
                    <div class="flex gap-1">
                      {asset.roles.map(role => (
                        <sl-badge variant="primary" size="small" pill>{role}</sl-badge>
                      ))}
                    </div>
                  )}
                </div>
                <div class="space-y-2">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    <span class="text-gray-600 dark:text-gray-400">Type:</span> {asset.type || 'N/A'}
                  </div>
                  {asset.title && (
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      <span class="text-gray-600 dark:text-gray-400">Title:</span> {asset.title}
                    </div>
                  )}
                  {asset.description && (
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      {asset.description}
                    </div>
                  )}
                  {asset.type && asset.type.startsWith('image/') && (
                    <div class="mt-2">
                      <img 
                        src={asset.href} 
                        alt={asset.title || name}
                        class="w-full h-32 object-cover rounded border border-gray-200 dark:border-gray-600"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div class="hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Image failed to load
                      </div>
                    </div>
                  )}
                  <div class="text-sm">
                    <a href={asset.href} target="_blank" rel="noopener noreferrer" class="text-blue-700 dark:text-blue-400 underline break-all">
                      {asset.href}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div class="text-gray-500 dark:text-gray-400">No assets</div>
        )}
      </div>

      {/* Upload Asset Dialog */}
      <UploadAssetDialog
        openState={[showUploadAssetDialog, setShowUploadAssetDialog]}
        item={currentItem()}
        onRequestClose={() => setShowUploadAssetDialog(false)}
        onSuccess={refreshItemData}
      />
    </div>
  );
}; 