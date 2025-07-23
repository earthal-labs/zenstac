// STAC API Service
// Handles all communication with the backend STAC server and Tauri commands

import { invoke } from '@tauri-apps/api/core';

// Dynamic API base URL that adapts to server configuration
let cachedApiBaseUrl = null;
let lastConfigCheck = 0;
const CONFIG_CACHE_DURATION = 5000; // 5 seconds

async function getApiBaseUrl() {
  const now = Date.now();
  
  // Return cached URL if it's still fresh
  if (cachedApiBaseUrl && (now - lastConfigCheck) < CONFIG_CACHE_DURATION) {
    return cachedApiBaseUrl;
  }
  
  try {
    // Get server configuration from backend
    const serverConfig = await invoke('get_server_config');
    const { internal_address, port } = serverConfig;
    
    // Construct the API base URL
    cachedApiBaseUrl = `http://${internal_address}:${port}/v1`;
    lastConfigCheck = now;
    
    return cachedApiBaseUrl;
  } catch (error) {
    // Fallback to default if we can't get the config
    cachedApiBaseUrl = 'http://localhost:3000/v1';
    lastConfigCheck = now;
    return cachedApiBaseUrl;
  }
}

// Function to clear the cache (useful when server config changes)
export function clearApiBaseUrlCache() {
  cachedApiBaseUrl = null;
  lastConfigCheck = 0;
  
}

// Function to force refresh the API base URL and notify components
export async function refreshApiConfiguration() {
  
  clearApiBaseUrlCache();
  
  // Dispatch a custom event to notify all components
  window.dispatchEvent(new CustomEvent('server-config-changed', {
    detail: { timestamp: Date.now() }
  }));
  
  // Return the new base URL
  return await getApiBaseUrl();
}

// Activity tracking for analytics
class ActivityTracker {
  constructor() {
    this.activities = [];
    this.maxActivities = 10; // Keep last 10 activities
    this.updateCallbacks = [];
  }

  addActivity(type, details, endpoint, status = 'success') {
    // Extract item and collection details from endpoint for better display
    const parts = endpoint.split('/');
    let itemId = null;
    let collectionId = null;
    
    // Extract collection and item IDs from endpoint
    if (parts[1] === 'collections' && parts.length >= 3) {
      collectionId = parts[2];
      if (parts.length >= 5 && parts[3] === 'items') {
        itemId = parts[4];
      }
    }
    
    const activity = {
      id: Date.now(),
      type,
      text: details,
      endpoint,
      status,
      timestamp: Date.now(),
      icon: this.getActivityIcon(type, status),
      tooltip: this.getActivityTooltip(endpoint, type, status),
      itemId,
      collectionId
    };

    this.activities.unshift(activity); // Add to beginning

    // Keep only the latest activities
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }
    
    // Notify all registered callbacks
    this.updateCallbacks.forEach(callback => callback());
  }

  // Register a callback to be called when activities update
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  // Remove a callback
  removeCallback(callback) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  getActivityIcon(type, status) {
    const icons = {
      'collection_view': 'folder',
      'collection_create': 'folder-plus',
      'collection_update': 'pencil-square',
      'collection_delete': 'folder-x',
      'collection_cleanup': 'trash3',
      'item_view': 'file-earmark',
      'item_create': 'file-earmark-plus',
      'item_update': 'pencil-square',
      'item_delete': 'file-earmark-x',
      'item_cleanup': 'trash3',
      'search_performed': 'search',
      'health_check': 'heart-pulse',
      'status_check': 'activity',
      'landing_page': 'house',
      'api_error': 'exclamation-triangle',
      'api_success': 'check-circle'
    };
    
    // For error status, always return error icon regardless of type
    if (status === 'error') {
      return 'exclamation-triangle';
    }
    
    return icons[type] || 'info-circle';
  }

  getRecentActivities(limit = 10) {
    return this.activities.slice(0, limit);
  }

  clearActivities() {
    this.activities = [];
    // Notify callbacks after clearing
    this.updateCallbacks.forEach(callback => callback());
  }

  // Helper method to generate detailed tooltip content
  getActivityTooltip(endpoint, type, status) {
    const parts = endpoint.split('/');
    
    if (status === 'error') {
      return `Failed ${type.replace('_', ' ')} operation on ${endpoint}`;
    }
    
    // Extract collection and item IDs from endpoint
    let collectionId = null;
    let itemId = null;
    
    if (parts[1] === 'collections' && parts.length >= 3) {
      collectionId = parts[2];
      if (parts.length >= 5 && parts[3] === 'items') {
        itemId = parts[4];
      }
    }
    
    switch (type) {
      case 'collection_create':
        return 'Created a new collection in the STAC catalog';
      case 'collection_update':
        return collectionId ? `Updated collection "${collectionId}" with new metadata` : 'Updated collection with new metadata';
      case 'collection_delete':
        return collectionId ? `Deleted collection "${collectionId}" from the catalog` : 'Deleted collection from the catalog';
      case 'collection_view':
        return collectionId ? `Viewed details for collection "${collectionId}"` : 'Viewed all available collections in the catalog';
      case 'item_create':
        return collectionId ? `Created a new item in collection "${collectionId}"` : 'Created a new item';
      case 'item_update':
        return (collectionId && itemId) ? `Updated item "${itemId}" in collection "${collectionId}"` : 'Updated item';
      case 'item_delete':
        return (collectionId && itemId) ? `Deleted item "${itemId}" from collection "${collectionId}"` : 'Deleted item';
      case 'item_cleanup':
        return (collectionId && itemId) ? `Started cleanup of asset files for item "${itemId}" in collection "${collectionId}"` : 'Started cleanup of asset files';
      case 'item_view':
        if (collectionId && itemId) {
          return `Viewed details for item "${itemId}" in collection "${collectionId}"`;
        } else if (collectionId) {
          return `Viewed all items in collection "${collectionId}"`;
        } else {
          return 'Viewed items';
        }
      case 'search_performed':
        return 'Performed a search query across the STAC catalog';
      case 'api_error':
        return `Failed operation on endpoint: ${endpoint}`;
      default:
        return `Performed ${type.replace('_', ' ')} operation on ${endpoint}`;
    }
  }
}

// Global activity tracker instance
export const activityTracker = new ActivityTracker();

// Utility function to find thumbnail asset
export const findThumbnailAsset = (item) => {
  // First look for asset with "thumbnail" role
  if (item.assets) {
    const thumbnailAsset = Object.values(item.assets).find(asset => 
      asset.roles && asset.roles.includes('thumbnail')
    );
    if (thumbnailAsset) {
      return thumbnailAsset;
    }
  }
  
  // Then look for explicit thumbnail asset by key
  if (item.assets?.thumbnail) {
    return item.assets.thumbnail;
  }
  
  // Then look for any image asset with "overview" role
  if (item.assets) {
    const overviewAsset = Object.values(item.assets).find(asset => 
      asset.roles && asset.roles.includes('overview') && 
      asset.type && asset.type.startsWith('image/')
    );
    if (overviewAsset) {
      return overviewAsset;
    }
  }
  
  // Then look for any image asset
  if (item.assets) {
    const imageAsset = Object.values(item.assets).find(asset => 
      asset.type && asset.type.startsWith('image/')
    );
    if (imageAsset) {
      return imageAsset;
    }
  }
  
  // Fallback to properties thumbnail_url if it exists
  if (item.properties?.thumbnail_url) {
    return {
      href: item.properties.thumbnail_url,
      type: 'image/jpeg',
      title: 'Thumbnail'
    };
  }
  
  return null;
};

// Utility function to find data assets
export const findDataAssets = (item) => {
  if (!item.assets) {
    return [];
  }
  
  return Object.values(item.assets).filter(asset => 
    asset.roles && asset.roles.includes('data')
  );
};

// Utility function to find assets by role
export const findAssetsByRole = (item, role) => {
  if (!item.assets) {
    return [];
  }
  
  return Object.values(item.assets).filter(asset => 
    asset.roles && asset.roles.includes(role)
  );
};

class STACApiService {
  constructor() {
    this.baseUrl = null; // Will be set dynamically
    
    // Listen for server configuration changes
    window.addEventListener('server-config-changed', async () => {

      await this.initializeBaseUrl();
    });
  }

  // Initialize or refresh the base URL
  async initializeBaseUrl() {
    this.baseUrl = await getApiBaseUrl();
  }

  // Generic API request helper with activity tracking
  async makeRequest(endpoint, options = {}) {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const requestType = this.getRequestType(endpoint, options.method);
    const shouldTrack = requestType !== null; // Only track if request type is not null
    const activityMessage = shouldTrack ? this.getActivityMessage(endpoint, options.method, requestType) : null;

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Try to get the error details from the response body
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.description) {
            errorMessage = `API Error ${response.status}: ${errorData.description}`;
          } else if (errorData.message) {
            errorMessage = `API Error ${response.status}: ${errorData.message}`;
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
        throw new Error(errorMessage);
      }
      
      // For DELETE operations, don't try to parse JSON if there's no content
      if (config.method === 'DELETE') {
        const contentLength = response.headers.get('content-length');
        const hasContent = contentLength && parseInt(contentLength) > 0;
        
        if (hasContent) {
          const data = await response.json();
          
          // Track successful request only if shouldTrack is true
          if (shouldTrack) {
            activityTracker.addActivity(
              requestType, 
              activityMessage, 
              endpoint, 
              'success'
            );
          }
          
          return data;
        } else {
          // Track successful request only if shouldTrack is true
          if (shouldTrack) {
            activityTracker.addActivity(
              requestType, 
              activityMessage, 
              endpoint, 
              'success'
            );
          }
          
          return { success: true, message: 'Resource deleted successfully' };
        }
      } else {
        const data = await response.json();
        
        // Track successful request only if shouldTrack is true
        if (shouldTrack) {
          activityTracker.addActivity(
            requestType, 
            activityMessage, 
            endpoint, 
            'success'
          );
        }
        
        return data;
      }
    } catch (error) {
      // Track failed request only if shouldTrack is true
      if (shouldTrack) {
        activityTracker.addActivity(
          requestType, 
          activityMessage || `Failed ${options.method || 'GET'} request`, 
          endpoint, 
          'error'
        );
      }
      
      throw error;
    }
  }

  // Helper method to generate activity messages
  getActivityMessage(endpoint, method, type) {
    const parts = endpoint.split('/');
    
    // Extract collection and item IDs from endpoint
    let collectionId = null;
    let itemId = null;
    
    if (parts[1] === 'collections' && parts.length >= 3) {
      collectionId = parts[2];
      if (parts.length >= 5 && parts[3] === 'items') {
        itemId = parts[4];
      }
    }
    
    switch (type) {
      case 'collection_view':
        return collectionId ? `Retrieved collection "${collectionId}"` : 'Retrieved all collections';
      case 'collection_create':
        return 'Created new collection';
      case 'collection_update':
        return collectionId ? `Updated collection "${collectionId}"` : 'Updated collection';
      case 'collection_delete':
        return collectionId ? `Deleted collection "${collectionId}"` : 'Deleted collection';
      case 'item_view':
        if (collectionId && itemId) {
          return `Retrieved item "${itemId}" from collection "${collectionId}"`;
        } else if (collectionId) {
          return `Retrieved items from collection "${collectionId}"`;
        } else {
          return 'Retrieved items';
        }
      case 'item_create':
        return collectionId ? `Created new item in collection "${collectionId}"` : 'Created new item';
      case 'item_update':
        return (collectionId && itemId) ? `Updated item "${itemId}" in collection "${collectionId}"` : 'Updated item';
      case 'item_delete':
        return (collectionId && itemId) ? `Deleted item "${itemId}" from collection "${collectionId}"` : 'Deleted item';
      case 'search_performed':
        return 'Performed item search';
      case 'health_check':
        return 'Checked server health';
      case 'status_check':
        return 'Checked server status';
      case 'landing_page':
        return 'Retrieved landing page';
      default:
        return `${method || 'GET'} request to ${endpoint}`;
    }
  }

  // Helper method to determine request type for activity tracking
  getRequestType(endpoint, method) {
    const parts = endpoint.split('/');
    
    // Landing page
    if (endpoint === '' || endpoint === '/') {
      return 'landing_page';
    }
    
    // Health check
    if (endpoint === '/health') {
      return 'health_check';
    }
    
    // Collections
    if (parts[1] === 'collections') {
      if (parts.length === 2) {
        return method === 'POST' ? 'collection_create' : 'collection_view';
      } else if (parts.length === 3) {
        return method === 'PUT' ? 'collection_update' : 
               method === 'DELETE' ? 'collection_delete' : 'collection_view';
      } else if (parts.length === 4 && parts[3] === 'items') {
        return method === 'POST' ? 'item_create' : 'item_view';
      } else if (parts.length === 5 && parts[3] === 'items') {
        return method === 'PUT' ? 'item_update' : 
               method === 'DELETE' ? 'item_delete' : 'item_view';
      }
    }
    
    // Search
    if (endpoint === '/search') {
      return 'search_performed';
    }
    
    // Status check (conformance, etc.)
    if (endpoint === '/conformance' || endpoint === '/api') {
      return 'status_check';
    }
    
    return null; // Don't track this request type
  }

  // STAC API Endpoints

  // Landing page (catalog)
  async getLandingPage() {
    return this.makeRequest('/');
  }

  // API Specification
  async getApiSpec() {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    return this.makeRequest('/api');
  }

  async getBaseUrl() {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    
    try {
      // Get API information from the landing page
      const landingPage = await this.makeRequest('/');
      
      // Get external URL from backend config
      const serverConfig = await invoke('get_server_config');
      const externalUrl = serverConfig.external_url;
      
      return {
        baseUrl: this.baseUrl,
        externalUrl,
        version: landingPage.stac_version || '1.0.0',
        description: landingPage.description || 'ZenSTAC API - A lightweight STAC server. Powered by Earthal Labs.',
        title: landingPage.title || 'ZenSTAC API',
        id: landingPage.id || 'zenstac-catalog'
      };
    } catch (error) {
      // Fallback to hardcoded values if landing page fails
      return {
        baseUrl: this.baseUrl,
        externalUrl: 'http://localhost:3000/v1',
        version: '1.0.0',
        description: 'ZenSTAC API - A lightweight STAC server. Powered by Earthal Labs.',
        title: 'ZenSTAC API',
        id: 'zenstac-catalog'
      };
    }
  }

  // Get external URL for display purposes
  async getExternalUrl() {
    try {
      const serverConfig = await invoke('get_server_config');
      return serverConfig.external_url;
    } catch (error) {
      return 'http://localhost:3000/v1';
    }
  }

  // Execute API request for the interactive API page
  async executeApiRequest(path, method = 'GET', body = null) {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    const url = `${this.baseUrl}${path}`;


    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestOptions);
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      throw error;
    }
  }

  // Collections
  async getCollections() {
    const response = await this.makeRequest('/collections');
    return response.collections || [];
  }

  async getCollection(collectionId) {
    return this.makeRequest(`/collections/${collectionId}`);
  }

  // Items
  async getItems(collectionId, filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);
    if (filters.datetime) queryParams.append('datetime', filters.datetime);
    if (filters.bbox) queryParams.append('bbox', filters.bbox.join(','));
    
    const endpoint = `/collections/${collectionId}/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.makeRequest(endpoint);
    return response.features || [];
  }

  async getItem(collectionId, itemId) {
    return this.makeRequest(`/collections/${collectionId}/items/${itemId}`);
  }

  // Search
  async searchItems(searchParams = {}) {
    const body = {
      collections: searchParams.collections || [],
      datetime: searchParams.datetime || null,
      bbox: searchParams.bbox || null,
      intersects: searchParams.intersects || null,
      ids: searchParams.ids || null,
      limit: searchParams.limit || 10,
      query: searchParams.query || {},
      filter: searchParams.filter || null,
      sortby: searchParams.sortby || null,
      fields: searchParams.fields || null,
      filter_lang: searchParams.filter_lang || null
    };

    // Remove null values
    Object.keys(body).forEach(key => {
      if (body[key] === null) {
        delete body[key];
      }
    });

    const response = await this.makeRequest('/search', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return response;
  }

  // Helper methods for building search parameters
  buildDatetimeRange(startDate, endDate) {
    if (!startDate && !endDate) return null;
    
    // Convert HTML datetime-local format to RFC 3339 format
    const convertToRFC3339 = (dateString) => {
      if (!dateString) return null;
      // HTML datetime-local format is "YYYY-MM-DDTHH:MM" 
      // We need to convert it to RFC 3339 format "YYYY-MM-DDTHH:MM:SSZ"
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      } catch (e) {
        return null;
      }
    };
    
    const startRFC3339 = convertToRFC3339(startDate);
    const endRFC3339 = convertToRFC3339(endDate);
    
    if (!startRFC3339 && !endRFC3339) return null;
    if (startRFC3339 && !endRFC3339) return `${startRFC3339}/..`;
    if (!startRFC3339 && endRFC3339) return `../${endRFC3339}`;
    return `${startRFC3339}/${endRFC3339}`;
  }

  buildBbox(west, south, east, north) {
    if (!west || !south || !east || !north) return null;
    return [parseFloat(west), parseFloat(south), parseFloat(east), parseFloat(north)];
  }

  buildQueryFilters(filters = {}) {
    const query = {};
    
    if (filters.text) {
      query.title = { $like: `%${filters.text}%` };
    }
    
    if (filters.cloudCover) {
      query['eo:cloud_cover'] = { $lte: parseFloat(filters.cloudCover) };
    }
    
    if (filters.platform) {
      query['eo:platform'] = { $eq: filters.platform };
    }
    
    if (filters.instrument) {
      query['eo:instrument'] = { $eq: filters.instrument };
    }
    
    return Object.keys(query).length > 0 ? query : null;
  }

  // Health and status checks
  async healthCheck() {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    try {
      const response = await this.makeRequest('/health');
      return response;
    } catch (error) {
      throw error;
    }
  }

  async statusCheck() {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    
    try {
      // Check health endpoint
      let healthStatus = 'unhealthy';
      try {
        const healthResponse = await this.makeRequest('/health');
        healthStatus = 'healthy';
      } catch (error) {
        // error intentionally ignored for status
      }

      // Check collections endpoint
      let collectionsStatus = 'unavailable';
      try {
        const collectionsResponse = await this.makeRequest('/collections');
        collectionsStatus = 'available';
      } catch (error) {
        // error intentionally ignored for status
      }

      const status = {
        health: healthStatus,
        collections: collectionsStatus,
        timestamp: new Date().toISOString()
      };

      // Add activity tracking
      activityTracker.addActivity('status_check', 'Status check completed', '/status', 'success');

      return status;
    } catch (error) {
      activityTracker.addActivity('status_check', 'Status check failed', '/status', 'error');
      throw error;
    }
  }

  // Tauri Commands for Database Operations
  // These are used for operations that need direct database access

  async getDatabaseFileSize() {
    try {
      return await invoke('get_database_file_size');
    } catch (error) {
      return 0;
    }
  }

  async getAssetsDirectorySize() {
    try {
      return await invoke('get_assets_directory_size');
    } catch (error) {
      return 0;
    }
  }

  async getTotalDataVolume() {
    try {
      const [databaseSize, assetsSize] = await Promise.all([
        this.getDatabaseFileSize(),
        this.getAssetsDirectorySize()
      ]);
      
      return {
        database: databaseSize,
        assets: assetsSize,
        total: databaseSize + assetsSize
      };
    } catch (error) {
      return {
        database: 0,
        assets: 0,
        total: 0
      };
    }
  }

  async uploadRasterTiff(collectionId, itemId, bandName, tiffBytes) {
    try {
      return await invoke('upload_raster_tiff', {
        collectionId,
        itemId,
        bandName,
        tiffBytes
      });
    } catch (error) {
      throw error;
    }
  }

  // Async cleanup of item assets
  async cleanupItemAssets(collectionId, itemId) {
    try {
      const result = await invoke('cleanup_item_assets', {
        collectionId,
        itemId
      });
      
      // Track cleanup activity
      activityTracker.addActivity(
        'item_cleanup', 
        `Started cleanup of assets for item '${itemId}' in collection '${collectionId}'`, 
        `/cleanup/${collectionId}/${itemId}`, 
        'success'
      );
      
      return result;
    } catch (error) {
      
      // Track failed cleanup
      activityTracker.addActivity(
        'api_error', 
        `Failed to cleanup assets for item '${itemId}' in collection '${collectionId}': ${error.message}`, 
        `/cleanup/${collectionId}/${itemId}`, 
        'error'
      );
      
      throw error;
    }
  }

  // Manual cleanup for orphaned collection directories
  async cleanupOrphanedCollectionDirectories() {
    try {
      const result = await invoke('cleanup_orphaned_collection_directories');
      
      // Track cleanup activity
      activityTracker.addActivity(
        'collection_cleanup', 
        'Started cleanup of orphaned collection directories', 
        '/cleanup/orphaned-collections', 
        'success'
      );
      
      return result;
    } catch (error) {
      
      // Track failed cleanup
      activityTracker.addActivity(
        'api_error', 
        `Failed to cleanup orphaned collection directories: ${error.message}`, 
        '/cleanup/orphaned-collections', 
        'error'
      );
      
      throw error;
    }
  }

  // Collection management
  async deleteCollection(collectionId) {
    return this.makeRequest(`/collections/${collectionId}`, {
      method: 'DELETE'
    });
  }

  async updateCollection(collectionId, updates) {
    return this.makeRequest(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async putCollection(collectionId, collectionData) {
    return this.makeRequest(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(collectionData)
    });
  }

  async createCollection(collectionData) {
    // Only send required fields
    const minimal = {
      id: collectionData.id,
      title: collectionData.title,
      description: collectionData.description,
      license: collectionData.license
    };
    return this.makeRequest('/collections', {
      method: 'POST',
      body: JSON.stringify(minimal)
    });
  }

  // Item management
  async deleteItem(collectionId, itemId, triggerCleanup = true) {
    const response = await this.makeRequest(`/collections/${collectionId}/items/${itemId}`, {
      method: 'DELETE'
    });
    
    // The backend now automatically triggers cleanup, but we can also manually trigger it if needed
    if (triggerCleanup) {
      // The cleanup is already handled by the backend, but we can add additional logging
  
    }
    
    return response;
  }

  async updateItem(collectionId, itemId, updates) {
    return this.makeRequest(`/collections/${collectionId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async putItem(collectionId, itemId, itemData) {
    return this.makeRequest(`/collections/${collectionId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    });
  }

  async createItem(collectionId, itemData) {
    return this.makeRequest(`/collections/${collectionId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  }

  // File upload methods
  async uploadAsset(collectionId, itemId, assetKey, file) {
    if (!this.baseUrl) {
      await this.initializeBaseUrl();
    }
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/upload/${collectionId}/${itemId}/${assetKey}`;


    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
  

      // Add activity tracking
      activityTracker.addActivity('item_update', `Uploaded asset: ${assetKey}`, `/upload/${collectionId}/${itemId}/${assetKey}`, 'success');

      return result;
    } catch (error) {
      activityTracker.addActivity('item_update', `Failed to upload asset: ${assetKey}`, `/upload/${collectionId}/${itemId}/${assetKey}`, 'error');
      throw error;
    }
  }

  // Helper method to get asset URL following STAC convention
  getAssetUrl(collectionId, itemId, assetKey) {
    if (!this.baseUrl) {
      return null; // Cannot construct URL without baseUrl
    }
    return `${this.baseUrl}/collections/${collectionId}/items/${itemId}/${assetKey}`;
  }

  // Helper method to upload assets to an existing item
  async uploadAssetsToExistingItem(collectionId, itemId, assets = {}) {
    const uploadedAssets = {};
    
    for (const [assetKey, file] of Object.entries(assets)) {
      if (file instanceof File) {
        try {
          await this.uploadAsset(collectionId, itemId, assetKey, file);
          uploadedAssets[assetKey] = {
            href: this.getAssetUrl(collectionId, itemId, assetKey),
            type: file.type || 'application/octet-stream',
            title: file.name
          };
        } catch (error) {
          // Continue with other assets even if one fails
        }
      }
    }

    return uploadedAssets;
  }

  // Helper method to create item with uploaded assets
  async createItemWithAssets(collectionId, itemData, assets = {}) {

    
    // First create the item without assets
    const itemWithoutAssets = {
      ...itemData,
      assets: {}
    };

    const createdItem = await this.createItem(collectionId, itemWithoutAssets);


    // Then upload each asset - the backend upload handler will automatically
    // update the item's assets in the database, so we don't need to do it again
    for (const [assetKey, file] of Object.entries(assets)) {
      if (file instanceof File) {
        try {
      
          await this.uploadAsset(collectionId, itemData.id, assetKey, file);
      
        } catch (error) {
          // Continue with other assets even if one fails
        }
      }
    }

    // Fetch the updated item to verify assets were added
    try {
      const updatedItem = await this.getItem(collectionId, itemData.id);
  
    } catch (error) {
      // Fallback to hardcoded values if landing page fails
    }

    return createdItem;
  }
}

// Export the API service instance
export const stacApi = new STACApiService(); 