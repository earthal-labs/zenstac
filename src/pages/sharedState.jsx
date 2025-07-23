import { createSignal } from 'solid-js';
import { stacApi, activityTracker } from "../services/api.js";

// Create signals for state management
const createSharedState = () => {
  const [currentTab, setCurrentTab] = createSignal('home');
  const [collections, setCollections] = createSignal([]);
  const [items, setItems] = createSignal([]);
  const [searchResults, setSearchResults] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [analytics, setAnalytics] = createSignal(null);
  const [currentView, setCurrentView] = createSignal({ type: "list", data: null });
  const [forceUpdate, setForceUpdate] = createSignal(0);
  const [hasSearched, setHasSearched] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [itemsSearchQuery, setItemsSearchQuery] = createSignal("");
  const [collectionFilter, setCollectionFilter] = createSignal("");
  
  // Cache timestamps for data freshness
  const [collectionsLastLoaded, setCollectionsLastLoaded] = createSignal(0);
  const [itemsLastLoaded, setItemsLastLoaded] = createSignal(0);
  
  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;
  
  // Helper functions to check if data is fresh
  const isDataFresh = (lastLoaded) => {
    return Date.now() - lastLoaded < CACHE_DURATION;
  };
  
  const shouldLoadCollections = () => {
    const currentCollections = collections();
    const lastLoaded = collectionsLastLoaded();
    return currentCollections.length === 0 || !isDataFresh(lastLoaded);
  };
  
  const shouldLoadItems = () => {
    const currentItems = items();
    const lastLoaded = itemsLastLoaded();
    return currentItems.length === 0 || !isDataFresh(lastLoaded);
  };
  
  const [searchParams, setSearchParams] = createSignal({
    text: "",
    collection: "",
    startDate: "",
    endDate: "",
    bboxWest: "",
    bboxSouth: "",
    bboxEast: "",
    bboxNorth: "",
    maxCloudCover: ""
  });

  // Data loading and analytics logic
  const updateAnalytics = () => {

    const currentAnalytics = analytics();
    if (currentAnalytics) {
      const currentCollections = collections() || [];
      const currentItems = items() || [];
      const collectionBreakdown = currentCollections.map(collection => {
        const itemCount = currentItems.filter(item => item.collection === collection.id).length;
        return {
          name: collection.id,
          count: itemCount
        };
      });
      setAnalytics({
        ...currentAnalytics,
        collectionBreakdown: {
          collections: currentCollections,
          total: currentCollections.length,
          totalItems: currentItems.length,
          collectionStats: collectionBreakdown
        }
      });
  
    } else {
  
    }
  };

  const loadCollections = async () => {

    // Check if we need to load collections
    if (!shouldLoadCollections()) {
  
      return;
    }
    
    try {
      setLoading(true);
  
      const collectionsData = await stacApi.getCollections();
  
      
      if (!collectionsData || collectionsData.length === 0) {
    
        setCollections([]);
        setCollectionsLastLoaded(Date.now());
        return;
      }
      
      const transformedCollections = collectionsData.map(collection => ({
        id: collection.id,
        title: collection.title || collection.id,
        description: collection.description || "No description available",
        license: collection.license || "Unknown",
        extent: collection.extent || {
          spatial: { bbox: [[-180, -90, 180, 90]] },
          temporal: { interval: [["1900-01-01T00:00:00Z", null]] }
        },
        links: collection.links || [],
        summaries: collection.summaries || {},
        itemCount: 0, // Will be calculated when items are loaded
        spatialCoverage: collection.spatialCoverage || "Global",
        temporalCoverage: collection.temporalCoverage || "Unknown",
        updateFrequency: collection.updateFrequency || "Unknown"
      }));
      
  
      setCollections(transformedCollections);
      setCollectionsLastLoaded(Date.now());
      activityTracker.addActivity('collection_view', `Loaded ${transformedCollections.length} collections`, '/collections', 'success');
    } catch (error) {
      setCollections([]);
      activityTracker.addActivity('api_error', 'Failed to load collections', '/collections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {

    // Check if we need to load items
    if (!shouldLoadItems()) {
  
      return;
    }
    
    try {
      setLoading(true);
      const currentCollections = collections() || [];
  
      let allItems = [];
      for (const collection of currentCollections) {
        try {
      
          const itemsData = await stacApi.getItems(collection.id);
      
          const transformedItems = itemsData.map(item => ({
            id: item.id,
            collection: item.collection || collection.id,
            properties: {
              datetime: item.properties?.datetime || "Unknown",
              "eo:cloud_cover": item.properties?.cloud_cover || item.properties?.["eo:cloud_cover"] || null,
              "eo:platform": item.properties?.platform || item.properties?.["eo:platform"] || "Unknown",
              "eo:instrument": item.properties?.instruments?.[0] || item.properties?.["eo:instrument"] || "Unknown",
              ...item.properties
            },
            assets: item.assets || {
              thumbnail: { href: "https://via.placeholder.com/100x100/6b7280/ffffff?text=No+Image" }
            },
            bbox: item.bbox || null,
            geometry: item.geometry || null
          }));
          allItems = allItems.concat(transformedItems);
        } catch (error) {
          // Continue with other collections even if one fails
        }
      }
  
      setItems(allItems);
      const updatedCollections = currentCollections.map(collection => ({
        ...collection,
        itemCount: allItems.filter(item => item.collection === collection.id).length
      }));
      setCollections(updatedCollections);
      setItemsLastLoaded(Date.now());
      activityTracker.addActivity('item_view', `Loaded ${allItems.length} items from ${currentCollections.length} collections`, '/items', 'success');
      // Only call updateAnalytics if analytics data exists
      if (analytics()) {
        updateAnalytics();
      }
    } catch (error) {
      setItems([]);
      activityTracker.addActivity('api_error', 'Failed to load items', '/items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const currentCollections = collections() || [];
      const currentItems = items() || [];
      const totalCollections = currentCollections.length;
      const totalItems = currentItems.length;
      const collectionBreakdown = currentCollections.map(collection => {
        const itemCount = currentItems.filter(item => item.collection === collection.id).length;
        return {
          name: collection.id,
          count: itemCount
        };
      });
      const temporalStats = [
        { period: "Last 24h", count: Math.floor(totalItems * 0.1) },
        { period: "Last 7d", count: Math.floor(totalItems * 0.3) },
        { period: "Last 30d", count: Math.floor(totalItems * 0.6) },
        { period: "All time", count: totalItems }
      ];
      const recentActivity = activityTracker.getRecentActivities(10);
      setAnalytics({
        collectionBreakdown: {
          collections: currentCollections,
          total: totalCollections,
          totalItems: totalItems,
          collectionStats: collectionBreakdown
        },
        temporalStats: temporalStats,
        recentActivity: recentActivity
      });
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const navigateToCollection = (collection) => {
    setCurrentTab("collections");
    setCurrentView({ type: "details", data: collection });
    setForceUpdate(prev => prev + 1);
    if (collections().length === 0) {
      loadCollections();
    }
    // Navigate to collection details page
    window.history.pushState({}, '', `/collections/${collection.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navigateToItem = (item) => {
    setCurrentTab("items");
    setCurrentView({ type: "details", data: item });
    setForceUpdate(prev => prev + 1);
    if (items().length === 0) {
      loadItems();
    }
    // Navigate to item details page
    window.history.pushState({}, '', `/items/${item.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navigateBack = () => {
    setCurrentView({ type: "list", data: null });
    setForceUpdate(prev => prev + 1);
  };

  const refreshCollections = async () => {
    // Force reload by resetting cache timestamp
    setCollectionsLastLoaded(0);
    setItemsLastLoaded(0);
    
    // Store current collections to preserve custom fields
    const currentCollections = collections() || [];
    
    await loadCollections();
    
    // Restore custom fields that might have been lost during refresh
    const updatedCollections = collections().map(collection => {
      const currentCollection = currentCollections.find(c => c.id === collection.id);
      if (currentCollection) {
        return {
          ...collection,
          // Preserve custom fields if they exist in the current collection
          spatialCoverage: currentCollection.spatialCoverage || collection.spatialCoverage || "Global",
          temporalCoverage: currentCollection.temporalCoverage || collection.temporalCoverage || "Unknown",
          updateFrequency: currentCollection.updateFrequency || collection.updateFrequency || "Unknown"
        };
      }
      return collection;
    });
    
    setCollections(updatedCollections);
    updateAnalytics();
    setForceUpdate(prev => prev + 1);
  };

  const refreshItems = async () => {

    // Force reload by resetting cache timestamp
    setItemsLastLoaded(0);
    await loadItems();
    updateAnalytics();
    setForceUpdate(prev => prev + 1);

  };

  const refreshAnalytics = async () => {
    await loadAnalytics();
    setForceUpdate(prev => prev + 1);
  };

      // Function to clear cache
  const clearCache = () => {

    setCollectionsLastLoaded(0);
    setItemsLastLoaded(0);
    setCollections([]);
    setItems([]);
    setSearchResults([]);
    setAnalytics(null);
    setForceUpdate(prev => prev + 1);
  };

  // Listen for server configuration changes
  if (typeof window !== 'undefined') {
    window.addEventListener('server-config-changed', () => {
  
      clearCache();
      // Force refresh of data with new server configuration
      setTimeout(() => {
        loadCollections();
        loadItems();
      }, 1000); // Small delay to ensure server is ready
    });
  }

  return {
    // State signals
    currentTab,
    setCurrentTab,
    collections,
    setCollections,
    items,
    setItems,
    searchResults,
    setSearchResults,
    loading,
    setLoading,
    analytics,
    setAnalytics,
    currentView,
    setCurrentView,
    forceUpdate,
    setForceUpdate,
    hasSearched,
    setHasSearched,
    searchQuery,
    setSearchQuery,
    itemsSearchQuery,
    setItemsSearchQuery,
    collectionFilter,
    setCollectionFilter,
    searchParams,
    setSearchParams,
    
    // Cache state
    collectionsLastLoaded,
    itemsLastLoaded,
    
    // Functions
    loadCollections,
    loadItems,
    loadAnalytics,
    navigateToCollection,
    navigateToItem,
    navigateBack,
    refreshCollections,
    refreshItems,
    refreshAnalytics,
    clearCache,
    
    // Activity tracker
    activityTracker
  };
};

// Create a singleton instance
const sharedState = createSharedState();

// Hook to use shared state
export const useSharedState = () => {
  return {
    state: {
      currentTab: sharedState.currentTab,
      setCurrentTab: sharedState.setCurrentTab,
      collections: sharedState.collections,
      setCollections: sharedState.setCollections,
      items: sharedState.items,
      setItems: sharedState.setItems,
      searchResults: sharedState.searchResults,
      setSearchResults: sharedState.setSearchResults,
      loading: sharedState.loading,
      setLoading: sharedState.setLoading,
      analytics: sharedState.analytics,
      setAnalytics: sharedState.setAnalytics,
      currentView: sharedState.currentView,
      setCurrentView: sharedState.setCurrentView,
      forceUpdate: sharedState.forceUpdate,
      setForceUpdate: sharedState.setForceUpdate,
      hasSearched: sharedState.hasSearched,
      setHasSearched: sharedState.setHasSearched,
      searchQuery: sharedState.searchQuery,
      setSearchQuery: sharedState.setSearchQuery,
      itemsSearchQuery: sharedState.itemsSearchQuery,
      setItemsSearchQuery: sharedState.setItemsSearchQuery,
      collectionFilter: sharedState.collectionFilter,
      setCollectionFilter: sharedState.setCollectionFilter,
      searchParams: sharedState.searchParams,
      setSearchParams: sharedState.setSearchParams,
      collectionsLastLoaded: sharedState.collectionsLastLoaded,
      itemsLastLoaded: sharedState.itemsLastLoaded,
    },
    refreshCollections: sharedState.refreshCollections,
    refreshItems: sharedState.refreshItems,
    refreshAnalytics: sharedState.refreshAnalytics,
    loadCollections: sharedState.loadCollections,
    loadItems: sharedState.loadItems,
    loadAnalytics: sharedState.loadAnalytics,
    navigateToCollection: sharedState.navigateToCollection,
    navigateToItem: sharedState.navigateToItem,
    navigateBack: sharedState.navigateBack,
    clearCache: sharedState.clearCache,
    activityTracker: sharedState.activityTracker
  };
}; 