# ZenSTAC Frontend

The frontend for ZenSTAC is built with **SolidJS** and **Shoelace UI components**, providing a modern, reactive web interface for managing STAC catalogs.

## Architecture

### Technology Stack
- **SolidJS** - Reactive UI framework
- **Shoelace** - Web component library for UI
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Tauri** - Desktop application framework
- **Leaflet** - Lightweight, interactive mapping library

### Key Features
- **Reactive UI** - Real-time updates with SolidJS signals
- **Component-Based** - Modular, reusable components
- **Responsive Design** - Works on desktop and mobile
- **Dark/Light Theme** - Automatic theme switching
- **Accessibility** - WCAG compliant components

## Directory Structure

```
src/
├── components/                   # Reusable UI components
│   ├── AddCollectionDialog.jsx
│   ├── AddItemDialog.jsx
│   ├── AnalyticsDashboard.jsx
│   ├── CollectionDetails.jsx
│   ├── CollectionsTable.jsx
│   ├── DataTable.jsx
│   ├── EmptyState.jsx
│   ├── Header.jsx
│   ├── HelpDialog.jsx
│   ├── ItemDetails.jsx
│   ├── ItemsTable.jsx
│   ├── LeafletMap.jsx
│   ├── PageLayout.jsx
│   ├── SearchPanel.jsx
│   ├── SearchResults.jsx
│   ├── SettingsDialog.jsx
│   ├── ShoelaceDialog.jsx
│   ├── ShoelaceDrawer.jsx
│   ├── ShoelaceSearchInput.jsx
│   └── UploadAssetDialog.jsx
├── pages/                        # Application pages
│   ├── App.jsx                   # Main application component
│   ├── CollectionsPage.jsx
│   ├── DashboardPage.jsx
│   ├── HomePage.jsx
│   ├── ItemsPage.jsx
│   ├── SearchPage.jsx
│   ├── SearchResultsPage.jsx
│   └── sharedState.jsx           # Global state management
├── services/                     # Frontend services
│   ├── api.js                    # API client
│   ├── basemapService.js
│   └── themeService.js           # Theme management
├── assets/                       # Static assets
│   └── icons/                    # SVG icons
├── main.jsx                      # Application entry point
├── index.html                    # HTML template
└── styles.css                    # Global styles
```

## Getting Started

### Prerequisites
- **Node.js 18+**
- **pnpm** (recommended) or npm

### Development Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start development server**:
   ```bash
   pnpm dev
   ```

3. **Build for production**:
   ```bash
   pnpm build
   ```

## Components

### Core Components

#### `App.jsx`
Main application component that handles routing and global state.

#### `PageLayout.jsx`
Layout wrapper that provides consistent header, navigation, and structure.

#### `Header.jsx`
Application header with navigation, theme toggle, and user controls.

### Collection Management

#### `CollectionsTable.jsx`
Displays all STAC collections in a sortable, filterable table.

#### `AddCollectionDialog.jsx`
Modal dialog for creating new STAC collections.

#### `CollectionDetails.jsx`
Detailed view of a single collection with metadata and actions.

### Item Management

#### `ItemsTable.jsx`
Displays STAC items in a collection with search and filtering.

#### `AddItemDialog.jsx`
Modal dialog for creating new STAC items with geometry and metadata.

#### `ItemDetails.jsx`
Detailed view of a single item with assets and metadata.

#### `UploadAssetDialog.jsx`
File upload dialog for adding assets to STAC items.

### Search & Analytics

#### `SearchPanel.jsx`
Advanced search interface with spatial and temporal filters.

#### `SearchResults.jsx`
Displays search results with map and list views.

#### `AnalyticsDashboard.jsx`
Analytics and usage statistics dashboard.

### UI Components

#### `ShoelaceDialog.jsx`
Wrapper component for Shoelace dialog components.

#### `ShoelaceDrawer.jsx`
Wrapper component for Shoelace drawer components.

#### `DataTable.jsx`
Reusable data table component with sorting and pagination.

#### `EmptyState.jsx`
Empty state component for when no data is available.

## Development

### State Management

The application uses SolidJS signals for reactive state management:

```javascript
// Global state in sharedState.jsx
export const [collections, setCollections] = createSignal([]);
export const [items, setItems] = createSignal([]);
export const [loading, setLoading] = createSignal(false);
```

### API Integration

API calls are handled through the `api.js` service:

```javascript
// Example API call
import { api } from '../services/api.js';

const collections = await api.getCollections();
```

### Component Patterns

#### Creating a New Component

```javascript
import { createSignal, onMount } from 'solid-js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

export function MyComponent(props) {
  const [data, setData] = createSignal([]);
  
  onMount(async () => {
    // Component initialization
  });
  
  return (
    <div>
      <sl-button>Click me</sl-button>
    </div>
  );
}
```

#### Using Shoelace Components

```javascript
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

// Use Shoelace components with sl- prefix
<sl-button variant="primary">Primary Button</sl-button>
<sl-dialog label="My Dialog">Content</sl-dialog>
```

### Styling

The application uses Tailwind CSS for styling:

```javascript
// Tailwind classes
<div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
    Title
  </h1>
</div>
```

### Theme Support

Theme switching is handled by `themeService.js`:

```javascript
import { initializeDarkMode, toggleTheme } from '../services/themeService.js';

// Initialize theme on app start
await initializeDarkMode();

// Toggle theme
toggleTheme();
```

## Mapping

### LeafletMap Component

The application includes a Leaflet-based map component for spatial data visualization:

```javascript
import { LeafletMap } from '../components/LeafletMap.jsx';

<LeafletMap 
  items={items()} 
  onItemClick={handleItemClick}
  center={[0, 0]}
  zoom={2}
/>
```

### Basemap Service

Basemap configuration is managed through `basemapService.js`:

```javascript
import { getBasemaps } from '../services/basemapService.js';

const basemaps = getBasemaps();
```

## Responsive Design

The application is fully responsive and works on:

- **Desktop** - Full feature set with sidebar navigation
- **Tablet** - Adapted layout with collapsible navigation
- **Mobile** - Touch-optimized interface with bottom navigation

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Theming

### Light Theme
- Clean, modern interface
- High contrast for readability
- Subtle shadows and borders

### Dark Theme
- Dark backgrounds with light text
- Reduced eye strain
- Consistent with system preferences

### Customization

Themes can be customized by modifying the Tailwind configuration and CSS variables.

## Building

### Development Build
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
```

The built files will be in the `dist/` directory.

### Tauri Integration

The frontend is integrated with Tauri for desktop deployment:

```bash
# Build for Tauri
pnpm tauri build
```

## Resources

- [SolidJS Documentation](https://www.solidjs.com/guides)
- [Shoelace Documentation](https://shoelace.style/getting-started/installation)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tauri Documentation](https://tauri.app/docs)

## Contributing

We may open the project to external contributions in the future. When we do, this guide will be updated with:

- **Development setup instructions**
- **Code style guidelines**
- **Pull request process**
- **Issue reporting guidelines**
- **Testing requirements**

## Ideas and Feedback

While we're not accepting code contributions at the moment, we welcome:

- **Feature requests** - Share ideas for new functionality
- **Bug reports** - Help us identify and fix issues
- **Documentation improvements** - Suggest better explanations or examples
- **General feedback** - Let us know what you think of the project

### How to Share Feedback

1. **GitHub Issues** - Create an issue for bugs or feature requests
2. **GitHub Discussions** - Start a discussion for general feedback
3. **Email** - Reach out directly if you prefer

## What We're Working On

Our current development priorities include:

- **Core STAC API compliance**
- **Performance optimizations**
- **User interface improvements**
- **Documentation updates**
- **Testing coverage**
- **Offline basemap support**
- **Additional file import support**
- **Cloud support**

## License

This project is licensed under the PolyForm Noncommercial License for individuals and non-commercial use - see the [LICENSE](LICENSE.md) file for details.
For commercial use, please see the [COMMERCIAL LICENSE](COMMERCIAL_LICENSE.md)

---

**ZenSTAC** - Making geospatial data management simple and beautiful.