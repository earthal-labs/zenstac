import { createSignal, createMemo } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import { LeafletMap } from './LeafletMap.jsx';
import { ShoelaceDialog } from './ShoelaceDialog.jsx';
import { stacApi } from '../services/api.js';
import { useSharedState } from '../pages/sharedState.jsx';

export const CollectionDetails = (props) => {
  const { collection, onBack, onUpdate } = props;
  if (!collection) return <div class="p-4 text-gray-500">No collection selected.</div>;

  const { state, refreshCollections } = useSharedState();
  const [isEditing, setIsEditing] = createSignal(false);
  const [editedCollection, setEditedCollection] = createSignal({ ...collection });
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [isRefreshing, setIsRefreshing] = createSignal(false);
  const [showBboxEditor, setShowBboxEditor] = createSignal(false);
  const [showTemporalEditor, setShowTemporalEditor] = createSignal(false);
  
  // Temporary state for dialog editing
  const [tempBboxData, setTempBboxData] = createSignal('');
  const [tempTemporalData, setTempTemporalData] = createSignal('');

  const formatBbox = (bbox) => {
    if (!bbox || !Array.isArray(bbox) || bbox.length === 0) return 'N/A';
    return bbox[0].map(v => v.toFixed(6)).join(', ');
  };

  const formatTemporal = (temporal) => {
    if (!temporal || !Array.isArray(temporal.interval) || temporal.interval.length === 0) return 'N/A';
    const [start, end] = temporal.interval[0];
    return `${start || 'Unknown'} to ${end || 'Unknown'}`;
  };

  const handleEdit = () => {
    setEditedCollection({ ...collection });
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setEditedCollection({ ...collection });
  };
  
  const handleFieldChange = (key, value) => {
    setEditedCollection(ec => ({ ...ec, [key]: value }));
  };

  const handleExtentChange = (type, value) => {
    setEditedCollection(ec => ({
      ...ec,
      extent: {
        ...ec.extent,
        [type]: value
      }
    }));
  };

  const openBboxEditor = () => {
    const ec = isEditing() ? editedCollection() : collection;
    setTempBboxData(JSON.stringify(ec.extent?.spatial?.bbox || [], null, 2));
    setShowBboxEditor(true);
  };

  const openTemporalEditor = () => {
    const ec = isEditing() ? editedCollection() : collection;
    setTempTemporalData(JSON.stringify(ec.extent?.temporal?.interval || [], null, 2));
    setShowTemporalEditor(true);
  };

  const saveBboxChanges = () => {
    try {
      const parsed = JSON.parse(tempBboxData());
      handleExtentChange('spatial', { bbox: parsed });
      setShowBboxEditor(false);
    } catch (error) {
      alert('Invalid JSON format. Please check your BBox data.');
    }
  };

  const saveTemporalChanges = () => {
    try {
      const parsed = JSON.parse(tempTemporalData());
      handleExtentChange('temporal', { interval: parsed });
      setShowTemporalEditor(false);
    } catch (error) {
      alert('Invalid JSON format. Please check your temporal data.');
    }
  };
  
  function buildValidCollectionPayload(ec) {
  // Ensure temporal intervals are in RFC 3339 format
  const temporalInterval = ec.extent?.temporal?.interval || [[null, null]];
  const formattedTemporalInterval = temporalInterval.map(interval => {
    if (Array.isArray(interval) && interval.length === 2) {
      const [start, end] = interval;
      // Convert year strings to RFC 3339 format if needed
      const formatDate = (dateStr) => {
        if (!dateStr || dateStr === 'null') return null;
        if (dateStr.match(/^\d{4}$/)) {
          // If it's just a year, convert to full RFC 3339
          return `${dateStr}-01-01T00:00:00Z`;
        }
        return dateStr;
      };
      return [formatDate(start), formatDate(end)];
    }
    return interval;
  });

  // Use the original collection as a base and only update the changed fields
  const baseCollection = collection;
  
  // Build the payload with all fields including defaults for optional ones
  const payload = {
    type: "Collection",
    stac_version: baseCollection.stac_version || "1.0.0",
    stac_extensions: baseCollection.stac_extensions || [],
    id: ec.id,
    title: ec.title || baseCollection.title || "",
    description: ec.description,
    keywords: ec.keywords || baseCollection.keywords || [],
    license: ec.license,
    providers: ec.providers || baseCollection.providers || [],
    extent: {
      spatial: { bbox: ec.extent?.spatial?.bbox || baseCollection.extent?.spatial?.bbox || [[-180, -90, 180, 90]] },
      temporal: { interval: formattedTemporalInterval }
    },
    summaries: ec.summaries || baseCollection.summaries || {},
    links: baseCollection.links || [
      {
        href: `/collections/${ec.id}`,
        rel: "self",
        type: "application/json",
        title: `${ec.title || ec.id} Collection`
      }
    ],
    assets: ec.assets || baseCollection.assets || {},
    conformsTo: baseCollection.conforms_to || [
      "https://api.stacspec.org/v1.0.0/core",
      "https://api.stacspec.org/v1.0.0/collections",
      "https://api.stacspec.org/v1.0.0/item-search",
      "https://api.stacspec.org/v1.0.0/ogcapi-features"
    ]
  };

  return payload;
}

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = buildValidCollectionPayload(editedCollection());
      await stacApi.putCollection(collection.id, payload);
      setIsEditing(false);
      
      // Refresh collections data to get the updated collection
      if (onUpdate) {
        await onUpdate();
        // Force a re-render by updating the edited collection with the fresh data
        // The collection prop will be updated from the shared state
        setEditedCollection({ ...collection });
      }
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await stacApi.deleteCollection(collection.id);
      setShowDeleteDialog(false);
      
      // Refresh data first, then navigate back
      if (onUpdate) await onUpdate();
      if (onBack) onBack();
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBrowseItems = () => {
    // Set the collection filter and navigate to items page
    state.setCollectionFilter(collection.id);
    state.setCurrentTab("items");
    state.setCurrentView({ type: "list", data: null });
    window.history.pushState({}, '', '/items');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleRefreshMetadata = async () => {
    setIsRefreshing(true);
    try {
  
      
      // Get all items in this collection
      const itemsData = await stacApi.getItems(collection.id);
  
      
      if (itemsData.length === 0) {
        return; // Silently return if no items
      }

      // Calculate BBOX from all items
      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
      let minDateTime = null, maxDateTime = null;
      
      for (const item of itemsData) {
        // Calculate spatial extent from item BBOX
        if (item.bbox && Array.isArray(item.bbox) && item.bbox.length >= 4) {
          const [west, south, east, north] = item.bbox;
          minLon = Math.min(minLon, west);
          maxLon = Math.max(maxLon, east);
          minLat = Math.min(minLat, south);
          maxLat = Math.max(maxLat, north);
        }
        
        // Calculate temporal extent from item datetime
        if (item.properties?.datetime) {
          const itemDateTime = new Date(item.properties.datetime);
          if (!isNaN(itemDateTime.getTime())) {
            if (minDateTime === null || itemDateTime < minDateTime) {
              minDateTime = itemDateTime;
            }
            if (maxDateTime === null || itemDateTime > maxDateTime) {
              maxDateTime = itemDateTime;
            }
          }
        }
      }

      // Check if we found valid spatial data
      if (minLon === Infinity) {
        return; // Silently return if no valid spatial data
      }

      // Format the calculated extents
      const newBbox = [[minLon, minLat, maxLon, maxLat]];
      const newTemporalInterval = [
        [
          minDateTime ? minDateTime.toISOString() : null,
          maxDateTime ? maxDateTime.toISOString() : null
        ]
      ];

      

      // Update the collection with new metadata
      const updatedCollection = {
        ...collection,
        extent: {
          spatial: { bbox: newBbox },
          temporal: { interval: newTemporalInterval }
        }
      };

      // Build the payload and save
      const payload = buildValidCollectionPayload(updatedCollection);
      await stacApi.putCollection(collection.id, payload);
      
      // Refresh the collections data in shared state to reflect changes immediately
      if (onUpdate) {
        await onUpdate();
      } else {
        await refreshCollections();
      }
      
    } catch (error) {
      console.error('Error refreshing collection metadata:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const ec = createMemo(() => isEditing() ? editedCollection() : collection);

  return (
    <div class="space-y-6">
      {/* Header with actions */}
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <sl-icon name="collection" style="color: var(--sl-color-primary-600); font-size: 2rem;" />
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-0">{ec().title || ec().id}</h2>
          <sl-badge variant="primary" pill>{ec().id}</sl-badge>
        </div>
        <div class="flex gap-2">
          {onBack && (
            <sl-icon-button name="arrow-left" label="Back to Collections" onclick={onBack} />
          )}
          <sl-icon-button name="file-earmark" label="Browse Items" onclick={handleBrowseItems} />
          {!isEditing() ? (
            <>
              <sl-icon-button name="arrow-clockwise" label="Refresh Metadata" loading={isRefreshing()} onclick={handleRefreshMetadata} />
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
        label="Delete Collection?"
        class="max-w-md"
      >
        <div class="p-4">
          <p class="dark:text-white">Are you sure you want to delete this collection?</p>
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

      {/* Temporal Editor Dialog */}
      <ShoelaceDialog
        openState={[showTemporalEditor, setShowTemporalEditor]}
        label="Edit Temporal Extent"
        class="max-w-2xl"
      >
        <div class="p-4">
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Edit the temporal extent. Format: [["start_date", "end_date"]]</p>
          <sl-textarea
            value={tempTemporalData()}
            onInput={(e) => setTempTemporalData(e.target.value)}
            rows={8}
            placeholder="Enter temporal interval array..."
          />
        </div>
        <div slot="footer" class="flex gap-2 justify-end">
          <sl-button variant="default" onClick={() => setShowTemporalEditor(false)}>Cancel</sl-button>
          <sl-button variant="primary" onClick={saveTemporalChanges}>Save Changes</sl-button>
        </div>
      </ShoelaceDialog>

      {/* Map Preview Section */}
      <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <LeafletMap bbox={ec().extent?.spatial?.bbox[0]} id={`collection-details-map-${ec().id}`} />
      </div>

      {/* Description Section */}
      <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-4 dark:text-white">Description</h3>
        {isEditing() ? (
          <sl-textarea
            value={ec().description || ''}
            onInput={(e) => handleFieldChange('description', e.target.value)}
            rows={4}
            placeholder="Enter collection description..."
          />
        ) : (
          <p class="text-gray-700 dark:text-gray-200 text-base">{ec().description}</p>
        )}
      </div>

      {/* Basic Info Section */}
      <div class="details-section mb-6 p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-4 dark:text-white">Basic Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Collection ID */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Collection ID</div>
            {isEditing() ? (
              <sl-input
                value={ec().id}
                onInput={(e) => handleFieldChange('id', e.target.value)}
                size="small"
              />
            ) : (
              <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ec().id}</div>
            )}
          </div>

          {/* Title */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Title</div>
            {isEditing() ? (
              <sl-input
                value={ec().title || ''}
                onInput={(e) => handleFieldChange('title', e.target.value)}
                size="small"
              />
            ) : (
              <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ec().title}</div>
            )}
          </div>

          {/* License */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">License</div>
            {isEditing() ? (
              <sl-input
                value={ec().license || ''}
                onInput={(e) => handleFieldChange('license', e.target.value)}
                size="small"
              />
            ) : (
              <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ec().license}</div>
            )}
          </div>

          {/* STAC Version */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">STAC Version</div>
            {isEditing() ? (
              <sl-input
                value={ec().stac_version || '1.0.0'}
                onInput={(e) => handleFieldChange('stac_version', e.target.value)}
                size="small"
              />
            ) : (
              <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ec().stac_version || '1.0.0'}</div>
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
            <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{formatBbox(ec().extent?.spatial?.bbox)}</div>
            {isEditing() && (
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to edit spatial extent</div>
            )}
          </div>

          {/* Temporal */}
          <div 
            class={`bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px] flex flex-col ${isEditing() ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors' : ''}`}
            onclick={() => {
              if (isEditing()) {
                openTemporalEditor();
              }
            }}
          >
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">Temporal</div>
            <div class="text-sm font-medium text-gray-900 dark:text-white break-all flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{formatTemporal(ec().extent?.temporal)}</div>
            {isEditing() && (
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to edit temporal extent</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 