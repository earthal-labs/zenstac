import { onMount } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

const HomePage = () => {
  onMount(() => {
  
  });

  return (
    <div class="space-y-12">
      {/* Hero Section */}
      <div class="text-center space-y-6">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
          Welcome to ZenSTAC
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          A lightweight, STAC-compliant server for seamless geospatial data management
        </p>
        <div class="max-w-4xl mx-auto">
          <p class="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            ZenSTAC provides a streamlined approach to serving and managing STAC (SpatioTemporal Asset Catalog) 
            data. Built with simplicity and performance in mind, it offers an intuitive interface for exploring, 
            creating, and analyzing geospatial data collections without the complexity of traditional GIS platforms.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* STAC-Compliant Server Feature */}
        <div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div class="flex flex-col items-center text-center space-y-4">
            <sl-icon name="collection" style="color: var(--sl-color-primary-600); font-size: 3rem;" />
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">STAC-Compliant</h3>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
              Fully compliant with STAC specifications, ensuring seamless integration 
              with existing geospatial workflows and tools.
            </p>
          </div>
        </div>

        {/* Pocket-Sized Feature */}
        <div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div class="flex flex-col items-center text-center space-y-4">
            <sl-icon name="lightning-charge" style="color: var(--sl-color-primary-600); font-size: 3rem;" />
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Pocket-Sized</h3>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
              Ultra-lightweight with minimal resource footprint, perfect for 
              deployment in constrained environments or edge computing scenarios.
            </p>
          </div>
        </div>

        {/* Easy Deploy & Manage Feature */}
        <div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div class="flex flex-col items-center text-center space-y-4">
            <sl-icon name="gear" style="color: var(--sl-color-primary-600); font-size: 3rem;" />
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Cross-Platform</h3>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
              Simple deployment across multiple platforms. 
              Get up and running quickly with minimal configuration required.
            </p>
          </div>
        </div>

        {/* Free & Open Source Feature */}
        <div class="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div class="flex flex-col items-center text-center space-y-4">
            <sl-icon name="heart" style="color: var(--sl-color-primary-600); font-size: 3rem;" />
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Free & Open Source</h3>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
              Free to use non-commerically with full source code available. 
              Community-driven development with transparent, accessible technology.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 