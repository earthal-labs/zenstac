import { render } from 'solid-js/web';
import { registerIconLibrary } from '@shoelace-style/shoelace/dist/utilities/icon-library.js';
import { App } from './pages/App.jsx';
import { initializeDarkMode } from './services/themeService.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import './styles.css';

// Register Shoelace icon library to use icons from public/assets/icons
// Icons are served from /assets/icons/ in both dev and production
registerIconLibrary('default', {
  resolver: name => `/assets/icons/${name}.svg`,
  mutator: svg => svg.setAttribute('fill', 'currentColor')
});

window.addEventListener("DOMContentLoaded", async () => {
  // Initialize dark mode before rendering the app
  await initializeDarkMode();
  
  const appContainer = document.getElementById('app');
  
  if (!appContainer) {
    return;
  }
  
  // Render the main app with SolidJS
  render(() => <App />, appContainer);
}); 