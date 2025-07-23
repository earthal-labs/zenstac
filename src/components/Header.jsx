import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

import { SettingsDialog } from "./SettingsDialog.jsx";
import { HelpDialog } from "./HelpDialog.jsx";
import { ShoelaceDrawer } from "./ShoelaceDrawer.jsx";

export const Header = ({ activeTab, onTabChange }) => {
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [helpOpen, setHelpOpen] = createSignal(false);
  const [drawerOpen, setDrawerOpen] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);
  
  let tabGroupRef;
  let headerContainerRef;
  const tabGroupId = "header-tab-group-" + Math.random().toString(36).slice(2);
  let isProgrammaticSync = false; // Flag to prevent navigation loops
  let resizeObserver;
  
  // Check container size and update mobile state
  const checkContainerSize = () => {
    if (headerContainerRef) {
      const containerWidth = headerContainerRef.offsetWidth;
      setIsMobile(containerWidth < 800); // Show hamburger menu when container is smaller than 800px
    }
  };
  
  onMount(() => {
    // Initial container size check
    checkContainerSize();
    
    // Use ResizeObserver to watch the header container
    if (headerContainerRef && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        checkContainerSize();
      });
      resizeObserver.observe(headerContainerRef);
    } else {
      // Fallback to window resize listener
      window.addEventListener('resize', checkContainerSize);
    }
    
    // Add event listener for tab changes
    if (tabGroupRef) {
      const handleTabShow = (event) => {
        const panelName = event.detail.name;
    
        // Only trigger navigation if this is a user click, not programmatic sync
        if (onTabChange && !isProgrammaticSync) {
          onTabChange(panelName);
        }
      };
      
      tabGroupRef.addEventListener('sl-tab-show', handleTabShow);
      
      // Wait for the component to be ready, then set initial active tab
      setTimeout(() => {
        if (activeTab && activeTab()) {
          syncActiveTab();
        }
      }, 100);
      
      // Cleanup function
      onCleanup(() => {
        if (tabGroupRef) {
          tabGroupRef.removeEventListener('sl-tab-show', handleTabShow);
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
        } else {
          window.removeEventListener('resize', checkContainerSize);
        }
      });
    }
  });

  // Sync the active tab with the route
  const syncActiveTab = () => {
    if (tabGroupRef && activeTab && activeTab()) {
      const newActivePanel = activeTab();
      const currentActivePanel = tabGroupRef.getAttribute('active-panel');
  
      // Set flag to prevent navigation loops
      isProgrammaticSync = true;
      
      // Try multiple approaches to set the active panel
      tabGroupRef.setAttribute('active-panel', newActivePanel);
      
      // Also try setting the active panel property directly
      if (tabGroupRef.activePanel !== newActivePanel) {
        tabGroupRef.activePanel = newActivePanel;
      }
      
      // Try using the Shoelace tab group's show() method
      if (tabGroupRef.show) {
        tabGroupRef.show(newActivePanel);
      }
      
      // Also try clicking the tab directly
      const targetTab = tabGroupRef.querySelector(`sl-tab[panel="${newActivePanel}"]`);
      if (targetTab) {
        targetTab.click();
      }
      
      // Reset flag after a short delay to allow the click event to process
      setTimeout(() => {
        isProgrammaticSync = false;
      }, 100);
    }
  };

  // Use createEffect to reactively sync the active tab
  createEffect(() => {
    if (activeTab && activeTab()) {
      syncActiveTab();
    }
  });

  // Handle navigation from drawer
  const handleDrawerNavigation = (panelName) => {
    if (onTabChange) {
      onTabChange(panelName);
    }
    setDrawerOpen(false);
  };

  // Navigation items
  const navItems = [
    { panel: 'home', label: 'Home', icon: 'house' },
    { panel: 'api', label: 'API', icon: 'gear' },
    { panel: 'collections', label: 'Collections', icon: 'collection' },
    { panel: 'items', label: 'Items', icon: 'file-earmark' },
    { panel: 'search', label: 'Search', icon: 'search' },
    { panel: 'dashboard', label: 'Dashboard', icon: 'bar-chart' }
  ];

  return (
    <div class="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-[99999]">
      <div ref={headerContainerRef} class="w-full md:w-4/5 lg:w-3/5 mx-auto px-4">
        <div class="flex justify-between items-center py-4">
          {/* Brand/Logo Section */}
          <div class="flex items-center flex-shrink-0">
            <div class="flex items-center gap-2">
              <sl-icon name="globe-americas" class="text-2xl" style="color: var(--sl-color-primary-600);"></sl-icon>
              <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">ZenSTAC</h1>
            </div>
          </div>
          
          {/* Navigation Tabs - Hidden on mobile */}
          <div class={`flex-1 flex justify-center mx-8 ${isMobile() ? 'hidden' : 'flex'}`}>
            <sl-tab-group 
              ref={tabGroupRef}
              id={tabGroupId}
              activation="manual"
              class=""
            >
              <sl-tab slot="nav" panel="home">Home</sl-tab>
              <sl-tab slot="nav" panel="collections">Collections</sl-tab>
              <sl-tab slot="nav" panel="items">Items</sl-tab>
              <sl-tab slot="nav" panel="search">Search</sl-tab>
              <sl-tab slot="nav" panel="dashboard">Dashboard</sl-tab>
              <sl-tab slot="nav" panel="api">API</sl-tab>
            </sl-tab-group>
          </div>
          
          {/* Action Buttons */}
          <div class="flex items-center gap-2 flex-shrink-0">
            {/* Hamburger Menu Button - Only on mobile */}
            <sl-icon-button
              name="list"
              label="Menu"
              class={`text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${isMobile() ? 'block' : 'hidden'}`}
              onClick={() => setDrawerOpen(true)}
            />
            
            <sl-icon-button
              name="gear"
              label="Settings"
              class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              onClick={() => setSettingsOpen(true)}
            />
            <sl-icon-button
              name="question-circle"
              label="Help"
              class="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              onClick={() => setHelpOpen(true)}
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation Drawer */}
      <ShoelaceDrawer 
        openState={[drawerOpen, setDrawerOpen]}
        label="Navigation Menu"
        placement="end"
        class="w-80 "
      >
        <div class="p-4">
          <div class="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-gray-600">
            <sl-icon name="globe-americas" class="text-2xl" style="color: var(--sl-color-primary-600);"></sl-icon>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">ZenSTAC</h2>
          </div>
          
          <nav class="space-y-2">
            {navItems.map(item => (
              <sl-button
                variant={activeTab() === item.panel ? "primary" : "default"}
                size="large"
                class="w-full justify-start text-left"
                onClick={() => handleDrawerNavigation(item.panel)}
              >
                <sl-icon 
                  name={item.icon} 
                  slot="prefix"
                  class={activeTab() === item.panel ? "text-white" : "text-gray-600 dark:text-gray-300"}
                ></sl-icon>
                <span class={activeTab() === item.panel ? "text-white" : "text-gray-900 dark:text-white"}>
                  {item.label}
                </span>
              </sl-button>
            ))}
          </nav>
        </div>
      </ShoelaceDrawer>
      
      {/* Dialogs */}
      <SettingsDialog openState={[settingsOpen, setSettingsOpen]} />
      <HelpDialog openState={[helpOpen, setHelpOpen]} />
    </div>
  );
}; 