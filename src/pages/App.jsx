import { createSignal, onMount } from 'solid-js';
import HomePage from './HomePage.jsx';
import { CollectionsPage } from './CollectionsPage.jsx';
import { ItemsPage } from './ItemsPage.jsx';
import { DashboardPage } from './DashboardPage.jsx';
import { SearchPage } from './SearchPage.jsx';
import { SearchResultsPage } from './SearchResultsPage.jsx';
import { ItemDetails } from '../components/ItemDetails.jsx';
import { Header } from '../components/Header.jsx';
import { useSharedState } from './sharedState.jsx';
import { CollectionDetails } from '../components/CollectionDetails.jsx';
import { ApiPage } from './ApiPage.jsx';

// Main App Component
export const App = () => {
  const [currentPage, setCurrentPage] = createSignal('home');
  const [itemId, setItemId] = createSignal(null);
  const { state, loadItems, loadCollections, refreshCollections, refreshItems } = useSharedState();
  const [isLoadingItem, setIsLoadingItem] = createSignal(false);

  

  onMount(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
  
      const path = window.location.pathname;
      let newPage = 'home';
      
      if (path === '/') newPage = 'home';
      else if (path === '/collections') newPage = 'collections';
      else if (path === '/items') newPage = 'items';
      else if (path === '/search') newPage = 'search';
      else if (path === '/dashboard') newPage = 'dashboard';
      else if (path === '/api') newPage = 'api';
      else if (path === '/search-results') newPage = 'search-results';
      else if (path.startsWith('/items/')) {
        newPage = 'item-details';
        setItemId(decodeURIComponent(path.split('/')[2]));
      } else if (path.startsWith('/collections/')) {
        newPage = 'collection-details';
        setItemId(decodeURIComponent(path.split('/')[2])); // reuse itemId signal for collectionId
      }
      
  
      setCurrentPage(newPage);
    };

    window.addEventListener('popstate', handlePopState);
    // Set initial page based on current URL
    handlePopState();
  });

  const navigate = (page, path) => {

    setCurrentPage(page);
    window.history.pushState({}, '', path);
  };

  // Map current page to the correct tab for the Header
  const getActiveTab = () => {
    const page = currentPage();
    const activeTab = page === 'item-details' ? 'items' : 
                     page === 'collection-details' ? 'collections' : 
                     page;

    return activeTab;
  };

  return (
    <div class="w-full min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header 
        activeTab={getActiveTab}
        onTabChange={(tabName) => {
          const pageMap = {
            'home': 'home',
            'collections': 'collections', 
            'items': 'items',
            'search': 'search',
            'dashboard': 'dashboard',
            'api': 'api',
            'search-results': 'search-results',
            'item-details': 'items',
            'collection-details': 'collections'
          };
          const page = pageMap[tabName];
          if (page) {
            const pathMap = {
              'home': '/',
              'collections': '/collections',
              'items': '/items', 
              'search': '/search',
              'dashboard': '/dashboard',
              'api': '/api',
              'search-results': '/search-results',
              'item-details': '/items',
              'collection-details': '/collections'
            };
            navigate(page, pathMap[page]);
          }
        }}
      />
      <main class="w-3/5 mx-auto py-12">
        {currentPage() === 'home' && <HomePage />}
        {currentPage() === 'collections' && <CollectionsPage />}
        {currentPage() === 'items' && <ItemsPage />}
        {currentPage() === 'search' && <SearchPage />}
        {currentPage() === 'dashboard' && <DashboardPage />}
        {currentPage() === 'api' && <ApiPage />}
        {currentPage() === 'search-results' && <SearchResultsPage />}
        {currentPage() === 'item-details' && (() => {
          const itemIdValue = itemId();
      
          
          // Don't try to load if we don't have a valid item ID
          if (!itemIdValue) {
            return <div class="p-8 text-center text-gray-500 dark:text-gray-400">Invalid item ID.</div>;
          }
          
          const item = state.items().find(i => i.id === itemIdValue);
      
          
          if (!item && !isLoadingItem()) {
            setIsLoadingItem(true);
            loadItems().then(() => setIsLoadingItem(false));
          }
          if (isLoadingItem()) {
            return <div class="p-8 text-center text-gray-500 dark:text-gray-400">Loading item details...</div>;
          } else if (item) {
            return <ItemDetails item={item} onBack={() => navigate('items', '/items')} onUpdate={refreshItems} />;
          } else {
            return <div class="p-8 text-center text-gray-500 dark:text-gray-400">Item not found.</div>;
          }
        })()}
        {currentPage() === 'collection-details' && (() => {
          const collectionId = itemId();
      
          
          // Don't try to load if we don't have a valid collection ID
          if (!collectionId) {
            return <div class="p-8 text-center text-gray-500 dark:text-gray-400">Invalid collection ID.</div>;
          }
          
          const collection = state.collections().find(c => c.id === collectionId);
      
          
          if (!collection && !isLoadingItem()) {
            setIsLoadingItem(true);
            loadCollections().then(() => setIsLoadingItem(false));
          }
          if (isLoadingItem()) {
            return <div class="p-8 text-center text-gray-500 dark:text-gray-400">Loading collection details...</div>;
          } else if (collection) {
            return <CollectionDetails 
              collection={collection} 
              onBack={() => navigate('collections', '/collections')} 
              onUpdate={refreshCollections}
            />;
          } else {
            return <div class="p-8 text-center text-gray-500 dark:text-gray-400">Collection not found.</div>;
          }
        })()}
      </main>
    </div>
  );
}; 