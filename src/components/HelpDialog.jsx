import { createSignal } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import { ShoelaceDialog } from "./ShoelaceDialog.jsx";

export const HelpDialog = ({ openState }) => {
  const [isOpen, setIsOpen] = openState;
  const [activeTab, setActiveTab] = createSignal('help');

  return (
    <ShoelaceDialog
      openState={[isOpen, setIsOpen]}
      label="Help & Support"
      class="max-w-6xl"
    >
      <div style="padding: 1rem;">
        <sl-tab-group onSlTabShow={(e) => setActiveTab(e.detail.name)}>
          <sl-tab slot="nav" panel="info" active>
            <sl-icon slot="prefix" name="info-circle"></sl-icon>
            About
          </sl-tab>
          <sl-tab slot="nav" panel="support">
            <sl-icon slot="prefix" name="gear"></sl-icon>
            Support
          </sl-tab>
          <sl-tab slot="nav" panel="donate">
            <sl-icon slot="prefix" name="heart"></sl-icon>
            Contribute
          </sl-tab>

          {/* Info Tab */}
          <sl-tab-panel name="info">
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-semibold mb-4 dark:text-white">About ZenSTAC</h3>
                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                  <p>
                    ZenSTAC is a lightweight, STAC-compliant server designed for seamless geospatial data management. 
                    Built with simplicity and performance in mind, it offers an intuitive interface for exploring, 
                    creating, and analyzing geospatial data collections without the complexity of traditional GIS platforms.
                  </p>
                  <p>
                    Our mission is to make STAC data management accessible to everyone, from individual researchers 
                    to large organizations, with a focus on ease of deployment and minimal resource requirements.
                  </p>
                </div>
              </div>

              <sl-divider></sl-divider>

              <div>
                <h3 class="text-lg font-semibold mb-4 dark:text-white">Technical Information</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-300">Version:</span>
                    <span class="font-mono text-gray-900 dark:text-white">1.0.0</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-300">STAC Version:</span>
                    <span class="font-mono text-gray-900 dark:text-white">1.0.0</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-300">Framework:</span>
                    <span class="font-mono text-gray-900 dark:text-white">Tauri + SolidJS</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-300">Database:</span>
                    <span class="font-mono text-gray-900 dark:text-white">SQLite</span>
                  </div>
                </div>
              </div>
            </div>
          </sl-tab-panel>

          {/* Support Tab */}
          <sl-tab-panel name="support">
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-semibold mb-4 dark:text-white">Community Support</h3>
                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                  <p>
                    ZenSTAC is supported by a vibrant open-source community. If you're experiencing issues 
                    or have questions, there are several ways to get help and connect with other users.
                  </p>
                </div>
              </div>

              <sl-divider></sl-divider>

              <div>
                <h3 class="text-lg font-semibold mb-4 dark:text-white">Support Channels</h3>
                <div class="space-y-4">                  
                  <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <div class="font-semibold text-gray-900 dark:text-white">GitHub Issues</div>
                      <div class="text-sm text-gray-600 dark:text-gray-300">Report bugs and request features on our GitHub repository.</div>
                    </div>
                    <sl-button size="small" variant="primary" onClick={() => window.open('https://github.com/earthal-labs/zenstac/issues')}>
                      Open Issue
                    </sl-button>
                  </div>
                  
                  <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <div class="font-semibold text-gray-900 dark:text-white">Documentation</div>
                      <div class="text-sm text-gray-600 dark:text-gray-300">Browse our comprehensive documentation and tutorials.</div>
                    </div>
                    <sl-button size="small" variant="primary" onClick={() => window.open('https://github.com/earthal-labs/zenstac/discussions/categories/how-to')}>
                      View Docs
                    </sl-button>
                  </div>
                </div>
              </div>

            </div>
          </sl-tab-panel>

          {/* Contribute Tab */}
          <sl-tab-panel name="donate">
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-semibold mb-4 dark:text-white">Support ZenSTAC Development</h3>
                <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                  <p>
                    ZenSTAC is an open-source project developed with passion for the geospatial community. 
                    Your support helps us continue developing and improving this application for everyone.
                  </p>
                  <p>
                    Whether through code contributions, documentation, or financial support, every contribution 
                    helps make ZenSTAC better for the entire community.
                  </p>
                </div>
              </div>

              <sl-divider></sl-divider>

              <div>
                <h3 class="text-lg font-semibold mb-4 dark:text-white">Ways to Contribute</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <div class="font-semibold text-gray-900 dark:text-white">Star the Project</div>
                      <div class="text-sm text-gray-600 dark:text-gray-300">Show your support by starring our GitHub repository.</div>
                    </div>
                    <sl-button size="small" variant="primary" onClick={() => window.open('https://github.com/earthal-labs/zenstac')}>
                      Star on GitHub
                    </sl-button>
                  </div>
                  
                  <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <div class="font-semibold text-gray-900 dark:text-white">Financial Support</div>
                      <div class="text-sm text-gray-600 dark:text-gray-300">Support development through services or donations.</div>
                    </div>
                    <sl-button size="small" variant="primary" onClick={() => window.open('https://buymeacoffee.com/earthallabs')}>
                      Sponsor
                    </sl-button>
                  </div>
                </div>
              </div>
            </div>
          </sl-tab-panel>
        </sl-tab-group>
        
        <div style="text-align: right; margin-top: 1.5rem;">
          <sl-button
            variant="default"
            size="medium"
            onClick={() => setIsOpen(false)}
          >
            Close
          </sl-button>
        </div>
      </div>
    </ShoelaceDialog>
  );
}; 