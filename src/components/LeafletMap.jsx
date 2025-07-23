import { onMount, onCleanup, createSignal } from 'solid-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TerraDraw } from 'terra-draw';
import { TerraDrawLeafletAdapter } from 'terra-draw-leaflet-adapter';
import {
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode
} from 'terra-draw';
import { getCurrentBasemap, getBasemapByValue } from '../services/basemapService.js';

const ALL_MODES = [
  { key: 'edit', icon: 'hand-index', label: 'Edit' },
  { key: 'point', icon: 'dot', label: 'Point' },
  { key: 'linestring', icon: 'dash-lg', label: 'Line' },
  { key: 'polygon', icon: 'square', label: 'Polygon' },
];

const selectFlags = {
  polygon: {
    feature: {
      scaleable: true,
      rotateable: true,
      draggable: true,
      coordinates: {
        midpoints: true,
        draggable: true,
        deletable: true,
      },
    },
  },
  linestring: {
    feature: {
      draggable: true,
      coordinates: {
        midpoints: true,
        draggable: true,
        deletable: true,
      },
    },
  },
  point: {
    feature: {
      draggable: true,
    },
  },
};

export const LeafletMap = (props) => {
  let mapContainer;
  let parentContainer;
  let map = null;
  let terraDraw = null;
  let adapter = null;
  let tileLayer = null;
  let geoLayer = null; // For displaying existing geometries
  
  // Determine if this is a drawing map or viewing map
  const isDrawingMap = props.onGeometryChange || props.modes;
  const isViewingMap = props.geometry || props.bbox;
  
  // Use only the modes specified in props.modes, or all if not provided
  const enabledModes = (props.modes && Array.isArray(props.modes))
    ? ALL_MODES.filter(m => props.modes.includes(m.key))
    : ALL_MODES;
  const [activeMode, setActiveMode] = createSignal(enabledModes[0]?.key || 'edit');
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const [basemap, setBasemap] = createSignal(null);

  // Handle basemap change events
  const handleBasemapChange = (event) => {
    const newBasemapValue = event.detail.basemap;
    const newBasemap = getBasemapByValue(newBasemapValue);
    setBasemap(newBasemap);
    
    if (map && tileLayer) {
      map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(newBasemap.url, {
        maxZoom: newBasemap.maxZoom,
        attribution: newBasemap.attribution
      }).addTo(map);
    }
  };

  // Function to display existing geometry or bbox
  const displayExistingGeometry = () => {
    
    if (!map) {
      return;
    }
    
    // Remove any existing geo layer
    if (geoLayer) {
      map.removeLayer(geoLayer);
      geoLayer = null;
    }
    
    if (props.geometry) {
      geoLayer = L.geoJSON(props.geometry, {
        style: { color: '#2563eb', weight: 3, fillOpacity: 0.2 },
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 8, color: '#2563eb', fillOpacity: 0.7 })
      }).addTo(map);
      try {
        map.fitBounds(geoLayer.getBounds(), { maxZoom: 12, padding: [20, 20] });
      } catch (e) {
        map.setView([0, 0], 2);
      }
    } else if (props.bbox && props.bbox.length === 4) {
      const [[minX, minY, maxX, maxY]] = [props.bbox];
      const bounds = [[minY, minX], [maxY, maxX]];
      geoLayer = L.rectangle(bounds, { color: '#2563eb', weight: 2, fillOpacity: 0.1 }).addTo(map);
      map.fitBounds(bounds, { maxZoom: 12, padding: [20, 20] });
    } else {
      map.setView([0, 0], 2);
    }
  };

  onMount(async () => {
    
    // Both viewing and drawing maps now need both containers
    if (!mapContainer) {
      return;
    }
    if (!parentContainer) {
      return;
    }
    if (mapContainer._leafletMap) {
      return;
    }

    // Load the current basemap setting
    const currentBasemap = await getCurrentBasemap();
    setBasemap(currentBasemap);

    map = L.map(mapContainer, {
      center: [0, 0],
      zoom: 2,
      attributionControl: true,
      zoomControl: false, // Hide default zoom for all maps (we have custom controls)
    });
    mapContainer._leafletMap = map;

    // Use the selected basemap
    tileLayer = L.tileLayer(currentBasemap.url, {
      maxZoom: currentBasemap.maxZoom,
      attribution: currentBasemap.attribution
    }).addTo(map);

    // Initialize Terra Draw if this is a drawing map
    if (isDrawingMap) {
      adapter = new TerraDrawLeafletAdapter({ map, lib: L });
      const terraModes = [];
      // Always include select mode for editing
      terraModes.push(new TerraDrawSelectMode({ flags: selectFlags }));
      if (enabledModes.some(m => m.key === 'point')) terraModes.push(new TerraDrawPointMode());
      if (enabledModes.some(m => m.key === 'linestring')) terraModes.push(new TerraDrawLineStringMode());
      if (enabledModes.some(m => m.key === 'polygon')) terraModes.push(new TerraDrawPolygonMode());
      terraDraw = new TerraDraw({
        adapter,
        modes: terraModes
      });
      terraDraw.start();
      // Start in first enabled mode (edit if present, else first)
      if (enabledModes[0]?.key === 'edit') {
        terraDraw.setMode('select');
      } else {
        terraDraw.setMode(enabledModes[0]?.key);
      }
      setActiveMode(enabledModes[0]?.key || 'edit');

      // Listen for changes in the Terra Draw store
      const handleChange = () => {
        const features = terraDraw.getSnapshot();
        // Only return the last drawn feature's geometry (or null)
        const last = features.length > 0 ? features[features.length - 1] : null;
        if (props.onGeometryChange) {
          props.onGeometryChange(last ? last.geometry : null);
        }
      };
      terraDraw.on('change', handleChange);
    } else {
      // Display existing geometry for viewing maps
      displayExistingGeometry();
    }

    // Listen for fullscreen changes (for both viewing and drawing maps)
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === parentContainer);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    // Listen for basemap change events
    window.addEventListener('basemap-changed', handleBasemapChange);

    onCleanup(() => {
      // Exit fullscreen if this container is currently fullscreen
      if (document.fullscreenElement === parentContainer) {
        document.exitFullscreen();
      }
      if (terraDraw) {
        terraDraw.stop();
        terraDraw = null;
      }
      if (map) {
        map.remove();
        map = null;
        tileLayer = null;
        geoLayer = null;
      }
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('basemap-changed', handleBasemapChange);
    });
  });

  // Handler for toolbar button clicks (only for drawing maps)
  const handleModeClick = (mode) => {
    if (terraDraw) {
      if (mode === 'edit') {
        terraDraw.setMode('select');
      } else {
        terraDraw.setMode(mode);
      }
      setActiveMode(mode);
    }
  };

  // Shoelace toolbar map controls (only for drawing maps)
  const handleZoomIn = () => {
    if (map) map.zoomIn();
  };
  const handleZoomOut = () => {
    if (map) map.zoomOut();
  };
  const handleFullscreen = () => {
    if (!isFullscreen()) {
      parentContainer.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const height = props.mapHeight || (isDrawingMap ? 250 : 300);
  const style = props.style || `width: 100%; height: ${height}px; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 0.5rem; position: relative; z-index: 1;`;
  
  // For viewing maps, return a div with controls overlay
  if (!isDrawingMap) {
    return (
      <div ref={el => (parentContainer = el)} style={`position: relative; width: 100%; height: ${height}px;`}>
        {/* Shoelace Toolbar Overlay for viewing maps */}
        <div style="position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 8px;">
          {/* Map controls */}
          <sl-icon-button
            name="zoom-in"
            label="Zoom In"
            size="medium"
            style="margin: 0; border-radius: 6px;"
            onClick={handleZoomIn}
          />
          <sl-icon-button
            name="zoom-out"
            label="Zoom Out"
            size="medium"
            style="margin: 0; border-radius: 6px;"
            onClick={handleZoomOut}
          />
          <sl-icon-button
            name="fullscreen"
            label="Fullscreen"
            size="medium"
            style={`margin: 0; border-radius: 6px; background: ${isFullscreen() ? '#eff6ff' : 'transparent'};`}
            onClick={handleFullscreen}
            aria-pressed={isFullscreen()}
          />
        </div>
        <div ref={mapContainer} id={props.id || 'leaflet-map'} style={`width: 100%; height: 100%; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; position: relative; z-index: 1;`} />
      </div>
    );
  }
  
  // For drawing maps, return the full interface with toolbar
  return (
    <div ref={el => (parentContainer = el)} style={`position: relative; width: 100%; height: ${height}px;`}>
      {/* Shoelace Toolbar Overlay */}
      <div style="position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.9); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 8px;">
        {/* Map controls */}
        <sl-icon-button
          name="zoom-in"
          label="Zoom In"
          size="medium"
          style="margin: 0; border-radius: 6px;"
          onClick={handleZoomIn}
        />
        <sl-icon-button
          name="zoom-out"
          label="Zoom Out"
          size="medium"
          style="margin: 0; border-radius: 6px;"
          onClick={handleZoomOut}
        />
        <sl-icon-button
          name="fullscreen"
          label="Fullscreen"
          size="medium"
          style={`margin: 0; border-radius: 6px; background: ${isFullscreen() ? '#eff6ff' : 'transparent'};`}
          onClick={handleFullscreen}
          aria-pressed={isFullscreen()}
        />
        <div style="height: 1px; background: #e5e7eb; margin: 6px 0;" />
        {/* Drawing modes */}
        {enabledModes.map(mode => (
          <sl-icon-button
            name={mode.icon}
            label={mode.label}
            size="medium"
            style={`margin: 0; border-radius: 6px; border: 2px solid ${activeMode() === mode.key ? '#2563eb' : 'transparent'}; background: ${activeMode() === mode.key ? '#eff6ff' : 'transparent'};`}
            onClick={() => handleModeClick(mode.key)}
            aria-pressed={activeMode() === mode.key}
          />
        ))}
      </div>
      <div
        ref={mapContainer}
        style={`width: 100%; height: 100%; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; position: relative; z-index: 1;`}
      />
    </div>
  );
}; 