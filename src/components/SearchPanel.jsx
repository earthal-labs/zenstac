import { createSignal } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import { stacApi, findThumbnailAsset } from "../services/api.js";
import { serialize } from '@shoelace-style/shoelace/dist/utilities/form.js';
import { LeafletMap } from './LeafletMap.jsx';
import { useSharedState } from '../pages/sharedState.jsx';

export const SearchPanel = (props) => {
  const [isSearching, setIsSearching] = createSignal(false);
  const [searchError, setSearchError] = createSignal("");
  const [bbox, setBbox] = createSignal({ west: '', south: '', east: '', north: '' });
  const { state } = useSharedState();
  const setSearchResults = state.setSearchResults;

  let formRef;

  // When the map changes, update the form fields
  const handlePolygonChange = (geometry) => {
    if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates || !geometry.coordinates[0]) {
      setBbox({ west: '', south: '', east: '', north: '' });
      // Clear form fields
      ['bbox-west', 'bbox-south', 'bbox-east', 'bbox-north'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      return;
    }
    // Calculate bbox from polygon coordinates
    const coords = geometry.coordinates[0];
    let minLon = coords[0][0], maxLon = coords[0][0], minLat = coords[0][1], maxLat = coords[0][1];
    coords.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
    setBbox({
      west: minLon.toFixed(6),
      south: minLat.toFixed(6),
      east: maxLon.toFixed(6),
      north: maxLat.toFixed(6)
    });
    // Update form fields
    const ids = ['bbox-west', 'bbox-south', 'bbox-east', 'bbox-north'];
    [minLon, minLat, maxLon, maxLat].forEach((val, i) => {
      const el = document.getElementById(ids[i]);
      if (el) el.value = val.toFixed(6);
    });
  };

  // Form validation
  const validateFormData = (data) => {
    // Allow all valid search scenarios:
    // 1. All collections with no filters (empty search)
    // 2. Specific collection with no filters (returns all items in that collection)
    // 3. Any search with date range or bbox filters
    const hasSpecificCollection = data.collection && data.collection.trim() !== '';
    const hasDateRange = data.startDate || data.endDate;
    const hasBbox = data.bboxWest && data.bboxSouth && data.bboxEast && data.bboxNorth;
    
    // All search scenarios are valid - no validation errors needed
    if (data.bboxWest || data.bboxSouth || data.bboxEast || data.bboxNorth) {
      if (!data.bboxWest || !data.bboxSouth || !data.bboxEast || !data.bboxNorth) {
        return "Please provide all bounding box coordinates (West, South, East, North)";
      }
      const west = parseFloat(data.bboxWest);
      const south = parseFloat(data.bboxSouth);
      const east = parseFloat(data.bboxEast);
      const north = parseFloat(data.bboxNorth);
      if (isNaN(west) || isNaN(south) || isNaN(east) || isNaN(north)) {
        return "Bounding box coordinates must be valid numbers";
      }
      if (west >= east) {
        return "West coordinate must be less than East coordinate";
      }
      if (south >= north) {
        return "South coordinate must be less than North coordinate";
      }
    }
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start >= end) {
        return "Start date must be before end date";
      }
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSearchError("");
    try {
      const formData = serialize(formRef);
  
      
      const validationError = validateFormData(formData);
      if (validationError) {
        setSearchError(validationError);
        return;
      }
      setIsSearching(true);
      
      // Build search parameters
      const searchParams = {
        datetime: stacApi.buildDatetimeRange(formData.startDate, formData.endDate),
        bbox: stacApi.buildBbox(formData.bboxWest, formData.bboxSouth, formData.bboxEast, formData.bboxNorth),
        limit: 50
      };
      
      // Only add collections parameter if a specific collection is selected
      // If "All Collections" is selected (empty string), omit the collections parameter entirely
      if (formData.collection && formData.collection.trim() !== '') {
        searchParams.collections = [formData.collection];
      }
      
      // Remove null values and empty arrays
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] === null || (Array.isArray(searchParams[key]) && searchParams[key].length === 0)) {
          delete searchParams[key];
        }
      });
      
      
      const response = await stacApi.searchItems(searchParams);
      const transformedResults = (response.features || []).map(item => {
        const thumbnailAsset = findThumbnailAsset(item);
        
        return {
          id: item.id,
          title: item.properties?.title || item.id,
          description: item.properties?.description || "No description available",
          collection: item.collection,
          date: item.properties?.datetime ? new Date(item.properties.datetime).toLocaleDateString() : "Unknown",
          cloudCover: item.properties?.cloud_cover || item.properties?.["eo:cloud_cover"] || null,
          thumbnail: thumbnailAsset?.href || null,
          item: item
        };
      });
      setSearchResults(transformedResults);
      // Navigate to results page
      window.history.pushState({}, '', '/search-results');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      setSearchError(`Search failed: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear form
  const clearForm = () => {
    if (formRef) formRef.reset();
    setSearchError("");
    setBbox({ west: '', south: '', east: '', north: '' });
  };

  return (
    <div class="w-full">
      <div class="details-section mb-6 p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold mb-4 sm:mb-6 dark:text-white">Search Parameters</h3>
        <form ref={formRef} class="search-form space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          {/* Collection and Date Range Section */}
          <div class="space-y-4">
            <div class="relative" style="z-index: 9999;">
              <sl-select
                id="collection-filter"
                label="Collection"
                placeholder="Select a collection..."
                name="collection"
                class="w-full"
              >
                <sl-option value="">All Collections</sl-option>
                {props.collections && props.collections().map(collection => (
                  <sl-option value={collection.id}>{collection.title || collection.id}</sl-option>
                ))}
              </sl-select>
            </div>
            <div class="flex flex-col lg:flex-row gap-4">
              <sl-input
                id="start-date"
                label="Start Date"
                type="datetime-local"
                name="startDate"
                class="w-full"
                onInput={(e) => {}}
              />
              <sl-input
                id="end-date"
                label="End Date"
                type="datetime-local"
                name="endDate"
                class="w-full"
                onInput={(e) => {}}
              />
            </div>
          </div>

          {/* Geographic Bounding Box Section */}
          <div class="bg-gray-50 dark:bg-slate-700 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-600">
            <div class="flex flex-col xl:flex-row gap-4 sm:gap-6 items-start">
              <div class="flex-1 min-w-0 w-full">
                <div class="relative">
                  <LeafletMap
                    id="search-bbox-map"
                    style="width: 100%; height: 350px; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;"
                    mapHeight={350}
                    onGeometryChange={handlePolygonChange}
                    modes={['edit', 'polygon']}
                  />
                </div>
              </div>
              <div class="flex flex-col justify-center w-full xl:w-auto" style={{ minHeight: '250px', sm: { minHeight: '350px' } }}>
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                  <sl-input 
                    id="bbox-west" 
                    label="West" 
                    type="number" 
                    step="0.000001" 
                    placeholder="-180" 
                    name="bboxWest" 
                    value={bbox().west}
                    size="small"
                  />
                  <sl-input 
                    id="bbox-east" 
                    label="East" 
                    type="number" 
                    step="0.000001" 
                    placeholder="180" 
                    name="bboxEast" 
                    value={bbox().east}
                    size="small"
                  />
                  <sl-input 
                    id="bbox-south" 
                    label="South" 
                    type="number" 
                    step="0.000001" 
                    placeholder="-90" 
                    name="bboxSouth" 
                    value={bbox().south}
                    size="small"
                  />
                  <sl-input 
                    id="bbox-north" 
                    label="North" 
                    type="number" 
                    step="0.000001" 
                    placeholder="90" 
                    name="bboxNorth" 
                    value={bbox().north}
                    size="small"
                  />
                </div>
                <div class="mt-3 sm:mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                  <p>Click the pencil icon on the map to draw a bounding box</p>
                  <p>or manually enter coordinates</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center pt-4 border-t border-gray-200 dark:border-gray-600">
            <sl-button
              type="submit"
              variant="primary"
              size="medium"
              disabled={isSearching()}
              class="flex-1"
              name="submit"
            >
              {isSearching() ? (
                <>
                  <sl-icon name="arrow-clockwise" class="animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <sl-icon name="search" class="mr-2" />
                  Search Items
                </>
              )}
            </sl-button>
            <sl-icon-button
              name="arrow-clockwise"
              label="Clear Form"
              size="medium"
              style="font-size: 1.5rem;"
              onclick={clearForm}
              disabled={isSearching()}
            />
          </div>
        </form>
        {searchError() && (
          <div class="mt-4 sm:mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="text-red-600 dark:text-red-400 text-sm font-medium">
              {searchError()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 