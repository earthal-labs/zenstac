import { createSignal, onMount } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/components/relative-time/relative-time.js';
import '@shoelace-style/shoelace/dist/components/format-bytes/format-bytes.js';
import { stacApi } from "../services/api.js";
import { EmptyState } from "./EmptyState.jsx";

export const AnalyticsDashboard = (props) => {
  const [serverStatus, setServerStatus] = createSignal({
    overall: 'unknown',
    health: { status: 'unknown' },
    collections: { status: 'unknown' }
  });
  const [dataVolume, setDataVolume] = createSignal({
    database: 0,
    assets: 0,
    total: 0
  });

  // Health monitoring
  onMount(() => {
    checkServerStatus();
    getDataVolume();
    const interval = setInterval(checkServerStatus, 60000);
    
    // Listen for server configuration changes
    const handleServerConfigChange = () => {
  
      setTimeout(checkServerStatus, 1000); // Small delay to ensure server is ready
    };
    window.addEventListener('server-config-changed', handleServerConfigChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('server-config-changed', handleServerConfigChange);
    };
  });

  async function getDataVolume() {
    try {
      const result = await stacApi.getTotalDataVolume();
      setDataVolume(result);
    } catch {
      setDataVolume({
        database: 0,
        assets: 0,
        total: 0
      });
    }
  }

  async function checkServerStatus() {
    try {
      const status = await stacApi.statusCheck();

      // Map to expected structure
      const healthOk = status.health === 'healthy';
      const collectionsOk = status.collections === 'available';

      let overall = 'unknown';
      if (healthOk && collectionsOk) {
        overall = 'healthy';
      } else if (healthOk || collectionsOk) {
        overall = 'degraded';
      } else {
        overall = 'unhealthy';
      }

      setServerStatus({
        overall,
        health: { status: healthOk ? 'healthy' : 'unhealthy' },
        collections: { status: collectionsOk ? 'healthy' : 'unhealthy' }
      });
    } catch (error) {
      setServerStatus({
        overall: 'unhealthy',
        health: { status: 'unhealthy' },
        collections: { status: 'unhealthy' }
      });
    }
  }

  const analyticsData = () => props.analytics?.() || {};
  const totalCollections = () => analyticsData().collectionBreakdown?.total || 0;
  const totalItems = () => analyticsData().collectionBreakdown?.totalItems || 0;
  const collectionStats = () => analyticsData().collectionBreakdown?.collectionStats || [];

  // Helper functions for activity icons/colors
  function getActivityIcon(type) {
    const icons = {
      'collection_view': 'folder',
      'item_view': 'file-earmark',
      'search_performed': 'search',
      'health_check': 'heart-pulse',
      'status_check': 'activity',
      'landing_page': 'house',
      'api_error': 'exclamation-triangle',
      'api_success': 'check-circle',
      'default': 'info-circle'
    };
    return icons[type] || icons.default;
  }
  function getActivityColor(type, status) {
    if (status === 'error') return 'var(--sl-color-danger-600)';
    const colors = {
      'collection_view': 'var(--sl-color-primary-600)',
      'collection_create': 'var(--sl-color-success-600)',
      'collection_update': 'var(--sl-color-warning-600)',
      'collection_delete': 'var(--sl-color-danger-600)',
      'item_view': 'var(--sl-color-primary-600)',
      'item_create': 'var(--sl-color-success-600)',
      'item_update': 'var(--sl-color-warning-600)',
      'item_delete': 'var(--sl-color-danger-600)',
      'search_performed': 'var(--sl-color-info-600)',
      'health_check': 'var(--sl-color-warning-600)',
      'status_check': 'var(--sl-color-warning-600)',
      'landing_page': 'var(--sl-color-neutral-600)',
      'api_error': 'var(--sl-color-danger-600)',
      'api_success': 'var(--sl-color-success-600)',
      'default': 'var(--sl-color-neutral-600)'
    };
    return colors[type] || colors.default;
  }

  return (
    <div class="">
      <div class="bg-transparent border-none shadow-none">
        <div class="analytics-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-0">
          {/* Summary Cards */}
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow transition-all duration-300 h-full flex flex-col hover:-translate-y-0.5 hover:shadow-lg min-h-[160px] border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3 mb-4">
              <sl-icon name="collection" style="color: var(--sl-color-primary-600); font-size: 24px;" />
              <h3 class="m-0 text-base font-semibold text-slate-700 dark:text-slate-200">Total Collections</h3>
            </div>
            <p class="text-3xl font-bold text-slate-900 dark:text-white m-0 mb-2 leading-none">{totalCollections()}</p>
            <p class="text-sm text-slate-600 dark:text-slate-300 m-0 leading-relaxed">Available STAC collections</p>
          </div>

          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow transition-all duration-300 h-full flex flex-col hover:-translate-y-0.5 hover:shadow-lg min-h-[160px] border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3 mb-4">
              <sl-icon name="file-earmark" style="color: var(--sl-color-success-600); font-size: 24px;" />
              <h3 class="m-0 text-base font-semibold text-slate-700 dark:text-slate-200">Total Items</h3>
            </div>
            <p class="text-3xl font-bold text-slate-900 dark:text-white m-0 mb-2 leading-none">{totalItems()}</p>
            <p class="text-sm text-slate-600 dark:text-slate-300 m-0 leading-relaxed">Total STAC items across all collections</p>
          </div>

          <sl-tooltip 
            content={`Database: ${dataVolume().database === 0 ? 'Calculating...' : new Intl.NumberFormat('en-US', { 
              notation: 'compact', 
              maximumFractionDigits: 1 
            }).format(dataVolume().database)}B | Assets: ${dataVolume().assets === 0 && dataVolume().total === 0 ? 'Calculating...' : new Intl.NumberFormat('en-US', { 
              notation: 'compact', 
              maximumFractionDigits: 1 
            }).format(dataVolume().assets)}B`} 
            placement="top" 
            trigger="hover"
          >
            <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow transition-all duration-300 h-full flex flex-col hover:-translate-y-0.5 hover:shadow-lg min-h-[160px] border border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-3 mb-4">
                <sl-icon name="hdd" style="color: var(--sl-color-warning-600); font-size: 24px;" />
                <h3 class="m-0 text-base font-semibold text-slate-700 dark:text-slate-200">Data Volume</h3>
              </div>
              <p class="text-3xl font-bold text-slate-900 dark:text-white m-0 mb-2 leading-none">
                {dataVolume().total === 0 ? 'Calculating...' : (
                  <sl-format-bytes value={dataVolume().total.toString()} display="narrow" />
                )}
              </p>
              <p class="text-sm text-slate-600 dark:text-slate-300 m-0 leading-relaxed">Total app data volume</p>
            </div>
          </sl-tooltip>

          {/* Collection Breakdown */}
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow h-full flex flex-col min-h-[160px] border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3 mb-6">
              <sl-icon name="pie-chart" style="color: var(--sl-color-primary-600); font-size: 20px;" />
              <h3 class="m-0 text-lg font-semibold text-slate-800 dark:text-slate-100">Collection Breakdown</h3>
            </div>
            {collectionStats().length > 0 ? (
              <div class="flex flex-col gap-4">
                {collectionStats().map(collectionStat => (
                  <div class="flex flex-col gap-2">
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                      <span class="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">{collectionStat.name}</span>
                      <sl-badge variant="primary" pill style="font-size: 12px; font-weight: 600;">
                        {collectionStat.count}
                      </sl-badge>
                    </div>
                    <div class="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-sm overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-sm transition-all duration-300"
                        style={{ width: totalItems() > 0 ? `${Math.round((collectionStat.count / totalItems()) * 100)}%` : '0%' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="folder-x" title="No Collections" description="No collection stats available." />
            )}
          </div>

          {/* Recent Activity */}
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow transition-all duration-300 h-full flex flex-col border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3 mb-6">
              <sl-icon name="activity" style="color: var(--sl-color-primary-600); font-size: 20px;" />
              <h3 class="m-0 text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Activity</h3>
            </div>
            {(() => {
              const recentActivity = analyticsData().recentActivity || [];
              if (recentActivity.length > 0) {
                return (
                  <div class="flex flex-col gap-4 max-h-[300px] overflow-y-auto">
                    {recentActivity.map(activity => {
                      const iconName = activity.icon || getActivityIcon(activity.type);
                      const color = getActivityColor(activity.type, activity.status);
                      return (
                        <sl-tooltip content={activity.tooltip || activity.text} placement="top" trigger="hover">
                          <div
                            class="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                            style="display: flex; align-items: center; gap: 12px;"
                          >
                            <sl-icon
                              name={iconName}
                              style={`color: ${color}; font-size: 16px; flex-shrink: 0;`}
                            />
                            <div class="flex flex-col gap-1 flex-1">
                              <div class="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">{activity.text}</div>
                              <div class="text-slate-500 dark:text-slate-300">
                                <sl-relative-time
                                  date={new Date(activity.timestamp)}
                                  format="narrow"
                                  sync
                                  style="font-size: 0.7rem;"
                                />
                              </div>
                            </div>
                          </div>
                        </sl-tooltip>
                      );
                    })}
                  </div>
                );
              } else {
                return (
                  <div class="">
                    <p style="text-align: center; color: var(--sl-color-neutral-500); margin: 20px 0;">
                      No recent activity to display
                    </p>
                  </div>
                );
              }
            })()}
          </div>

          {/* Server Status */}
          <div class="bg-white dark:bg-slate-800 rounded-xl p-5 shadow transition-all duration-300 h-full flex flex-col border border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-3 mb-6">
              <sl-icon name="database" style="color: var(--sl-color-primary-600); font-size: 20px;" />
              <h3 class="m-0 text-lg font-semibold text-slate-800 dark:text-slate-100">Server Status</h3>
            </div>
            <div class="grid grid-cols-1 gap-3">
              {/* Overall Status */}
              <div class="flex justify-between items-center">
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">Overall Status</div>
                <sl-badge
                  variant={serverStatus().overall === 'healthy' ? 'success'
                    : serverStatus().overall === 'degraded' ? 'warning'
                    : serverStatus().overall === 'unhealthy' ? 'danger' : 'neutral'}
                  pill
                  pulse
                  style="font-size: 12px; font-weight: 600;"
                >
                  {serverStatus().overall === 'healthy' ? 'HEALTHY'
                    : serverStatus().overall === 'degraded' ? 'DEGRADED'
                    : serverStatus().overall === 'unhealthy' ? 'UNHEALTHY' : 'UNKNOWN'}
                </sl-badge>
              </div>
              {/* Individual Endpoints */}
              <div class="flex justify-between items-center">
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">Health Check</div>
                <sl-badge
                  variant={serverStatus().health?.status === 'healthy' ? 'success' : 'danger'}
                  pill
                  style="font-size: 11px;"
                >
                  {serverStatus().health?.status === 'healthy' ? 'OK' : 'ERROR'}
                </sl-badge>
              </div>
              <div class="flex justify-between items-center">
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">Collections API</div>
                <sl-badge
                  variant={serverStatus().collections?.status === 'healthy' ? 'success' : 'danger'}
                  pill
                  style="font-size: 11px;"
                >
                  {serverStatus().collections?.status === 'healthy' ? 'OK' : 'ERROR'}
                </sl-badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 