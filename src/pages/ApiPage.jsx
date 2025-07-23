import { createSignal, onMount, createMemo } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/details/details.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import { stacApi } from '../services/api.js';

export const ApiPage = () => {
  const [loading, setLoading] = createSignal(true);
  const [apiSpec, setApiSpec] = createSignal(null);
  const [apiInfo, setApiInfo] = createSignal(null);
  const [error, setError] = createSignal(null);
  
  // Interactive API testing state
  const [expandedEndpoints, setExpandedEndpoints] = createSignal(new Set());
  const [requestData, setRequestData] = createSignal({});
  const [responses, setResponses] = createSignal({});
  const [loadingRequests, setLoadingRequests] = createSignal(new Set());

  onMount(async () => {
    try {
      const [spec, info] = await Promise.all([
        stacApi.getApiSpec(),
        stacApi.getBaseUrl()
      ]);
      
      setLoading(false);
      setApiSpec(spec);
      setApiInfo(info);
      setError(null);
      
    } catch (err) {
      setLoading(false);
      setApiSpec(null);
      setApiInfo(null);
      setError(err.message);
    }
  });

  const endpoints = createMemo(() => {
    const spec = apiSpec();
    
    if (!spec || !spec.paths) return [];
    
    const paths = spec.paths;
    const endpoints = [];
    
    Object.entries(paths).forEach(([path, pathItem]) => {
      if (pathItem.get) {
        endpoints.push({
          path,
          method: 'GET',
          summary: pathItem.get.summary,
          description: pathItem.get.description,
          tags: pathItem.get.tags || ['Other'],
          parameters: pathItem.get.parameters || [],
          responses: pathItem.get.responses || {}
        });
      }
      if (pathItem.post) {
        endpoints.push({
          path,
          method: 'POST',
          summary: pathItem.post.summary,
          description: pathItem.post.description,
          tags: pathItem.post.tags || ['Other'],
          parameters: pathItem.post.parameters || [],
          requestBody: pathItem.post.requestBody,
          responses: pathItem.post.responses || {}
        });
      }
      if (pathItem.put) {
        endpoints.push({
          path,
          method: 'PUT',
          summary: pathItem.put.summary,
          description: pathItem.put.description,
          tags: pathItem.put.tags || ['Other'],
          parameters: pathItem.put.parameters || [],
          requestBody: pathItem.put.requestBody,
          responses: pathItem.put.responses || {}
        });
      }
      if (pathItem.delete) {
        endpoints.push({
          path,
          method: 'DELETE',
          summary: pathItem.delete.summary,
          description: pathItem.delete.description,
          tags: pathItem.delete.tags || ['Other'],
          parameters: pathItem.delete.parameters || [],
          responses: pathItem.delete.responses || {}
        });
      }
    });
    
    return endpoints;
  });

  const groupedEndpoints = createMemo(() => {
    const groups = {};
    endpoints().forEach(endpoint => {
      const tag = endpoint.tags[0] || 'Other';
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(endpoint);
    });
    
    // Define the desired order of sections
    const sectionOrder = ['Core', 'Collections', 'Items', 'Search', 'Sortables', 'Assets'];
    
    // Define HTTP method order
    const methodOrder = ['GET', 'POST', 'PUT', 'DELETE'];
    
    // Create ordered groups object
    const orderedGroups = {};
    
    // Add sections in the specified order
    sectionOrder.forEach(section => {
      if (groups[section]) {
        // Sort endpoints within each section: first by path length, then by method
        orderedGroups[section] = groups[section].sort((a, b) => {
          // First sort by path length (shortest first)
          const pathLengthDiff = a.path.length - b.path.length;
          if (pathLengthDiff !== 0) {
            return pathLengthDiff;
          }
          
          // If paths are same length, sort by HTTP method
          const methodAIndex = methodOrder.indexOf(a.method);
          const methodBIndex = methodOrder.indexOf(b.method);
          return methodAIndex - methodBIndex;
        });
      }
    });
    
    // Add any remaining sections that weren't in the order list
    Object.keys(groups).forEach(section => {
      if (!sectionOrder.includes(section)) {
        // Sort endpoints within each section: first by path length, then by method
        orderedGroups[section] = groups[section].sort((a, b) => {
          // First sort by path length (shortest first)
          const pathLengthDiff = a.path.length - b.path.length;
          if (pathLengthDiff !== 0) {
            return pathLengthDiff;
          }
          
          // If paths are same length, sort by HTTP method
          const methodAIndex = methodOrder.indexOf(a.method);
          const methodBIndex = methodOrder.indexOf(b.method);
          return methodAIndex - methodBIndex;
        });
      }
    });
    
    return orderedGroups;
  });

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'success';
      case 'POST': return 'primary';
      case 'PUT': return 'warning';
      case 'DELETE': return 'danger';
      default: return 'neutral';
    }
  };

  const toggleEndpoint = (endpointKey) => {
    const current = new Set(expandedEndpoints());
    if (current.has(endpointKey)) {
      current.delete(endpointKey);
    } else {
      current.add(endpointKey);
    }
    setExpandedEndpoints(current);
  };

  const expandEndpoint = (endpointKey) => {
    const current = new Set(expandedEndpoints());
    if (!current.has(endpointKey)) {
      current.add(endpointKey);
      setExpandedEndpoints(current);
    }
  };

  const updateRequestData = (endpointKey, data) => {
    setRequestData(prev => ({
      ...prev,
      [endpointKey]: data
    }));
  };

  const executeRequest = async (endpoint) => {
    const endpointKey = `${endpoint.method}-${endpoint.path}`;
    const currentData = requestData()[endpointKey] || {};
    
    // Ensure the endpoint stays expanded during the request
    expandEndpoint(endpointKey);
    
    // Small delay to ensure the state is properly set
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Build the actual endpoint path by replacing path parameters
    let actualPath = endpoint.path;
    const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
    
    pathParams.forEach(param => {
      const value = currentData[param.name] || param.default || '';
      actualPath = actualPath.replace(`{${param.name}}`, value);
    });

    // Build query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
    const queryString = queryParams
      .map(param => {
        const value = currentData[param.name];
        return value ? `${param.name}=${encodeURIComponent(value)}` : null;
      })
      .filter(Boolean)
      .join('&');
    
    if (queryString) {
      actualPath += `?${queryString}`;
    }

    setLoadingRequests(prev => new Set([...prev, endpointKey]));

    try {
      let body = null;
      if ((endpoint.method === 'POST' || endpoint.method === 'PUT') && endpoint.requestBody) {
        body = currentData.requestBody || '{}';
      }

      const response = await stacApi.executeApiRequest(actualPath, endpoint.method, body);
      
      setResponses(prev => ({
        ...prev,
        [endpointKey]: response
      }));
    } catch (error) {
      setResponses(prev => ({
        ...prev,
        [endpointKey]: {
          error: true,
          message: error.message,
          status: 'error'
        }
      }));
    } finally {
      setLoadingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(endpointKey);
        return newSet;
      });
    }
  };

  const getDefaultRequestBody = (endpoint) => {
    if (!endpoint.requestBody) return '{}';
    
    // Try to provide a sensible default based on the endpoint
    if (endpoint.path.includes('/collections') && endpoint.method === 'POST') {
      return JSON.stringify({
        id: "example-collection",
        title: "Example Collection",
        description: "An example collection",
        license: "CC-BY-4.0"
      }, null, 2);
    }
    
    if (endpoint.path.includes('/items') && endpoint.method === 'POST') {
      return JSON.stringify({
        id: "example-item",
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [0, 0]
        },
        properties: {
          datetime: new Date().toISOString()
        }
      }, null, 2);
    }
    
    return '{}';
  };

  const formatResponse = (response) => {
    if (response.error) {
      return JSON.stringify({ error: response.message }, null, 2);
    }
    
    return JSON.stringify(response.data, null, 2);
  };

  const getParameterInput = (param, endpointKey) => {
    const currentValue = () => requestData()[endpointKey]?.[param.name] || '';
    
    const handleInput = (e) => {
      const value = e.target.value;
      updateRequestData(endpointKey, {
        ...requestData()[endpointKey],
        [param.name]: value
      });
    };
    
    return (
      <sl-input
        key={`${endpointKey}-${param.name}-input`}
        size="small"
        placeholder={param.description || param.name}
        value={currentValue()}
        onInput={handleInput}
      />
    );
  };

  return (
    <>
      {/* Loading State */}
      {loading() && (
        <div class="flex items-center justify-center min-h-screen">
          <sl-spinner size="large"></sl-spinner>
          <span class="ml-3 text-gray-600">Loading API documentation...</span>
        </div>
      )}

      {/* Error State */}
      {error() && (
        <div class="p-8">
          <sl-alert variant="danger" open>
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            <strong>Error loading API documentation</strong><br />
            {error()}
          </sl-alert>
        </div>
      )}

      {/* Content State */}
      {!loading() && !error() && apiSpec() && apiInfo() && (
        <div class="space-y-6">
          {/* Header */}
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                STAC API
              </h2>
            </div>
          </div>

          {/* API Info Card */}
          <div class="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">API Information</h2>
              <sl-badge variant="success">Active</sl-badge>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API URL</h3>
                <p class="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {apiInfo().externalUrl || apiInfo().baseUrl || 'Loading...'}
                </p>
                {apiInfo().externalUrl && apiInfo().externalUrl !== apiInfo().baseUrl && (
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Public-facing URL (External Address)
                  </p>
                )}
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Version</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {apiInfo().version}
                </p>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catalog ID</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {apiInfo().id}
                </p>
              </div>
              <div>
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {apiInfo().title}
                </p>
              </div>
              <div class="md:col-span-2">
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {apiInfo().description}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-6">
              {Object.entries(groupedEndpoints()).map(([tag, tagEndpoints]) => (
                <div class="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                  <div class="mb-4">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{tag}</h2>
                  </div>
                  
                  <div class="space-y-4">
                    {tagEndpoints.map((endpoint, index) => {
                      const endpointKey = `${endpoint.method}-${endpoint.path}`;
                      const isExpanded = expandedEndpoints().has(endpointKey) || index === 0;
                      const isLoading = loadingRequests().has(endpointKey);
                      const response = responses()[endpointKey];
                      
                      return (
                        <sl-details 
                          open={isExpanded} 
                          onSlToggle={() => toggleEndpoint(endpointKey)}
                        >
                          <div slot="summary" class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                            <sl-tag variant={getMethodColor(endpoint.method)} size="small">
                              {endpoint.method}
                            </sl-tag>
                            <span class="font-mono text-sm text-gray-600 dark:text-gray-400">
                              {endpoint.path}
                            </span>
                            <span class="text-sm text-gray-500">
                              {endpoint.summary}
                            </span>
                            <sl-icon 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              class="ml-auto text-gray-400"
                            />
                          </div>
                          
                          <div class="mt-4 space-y-4">
                            {/* Description */}
                            {endpoint.description && (
                              <p class="text-gray-600 dark:text-gray-300 text-sm">
                                {endpoint.description}
                              </p>
                            )}

                            {/* Path Parameters */}
                            {endpoint.parameters?.filter(p => p.in === 'path').length > 0 ? (
                              <div>
                                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Path Parameters</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {endpoint.parameters.filter(p => p.in === 'path').map(param => (
                                    <div>
                                      <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        {param.name} {param.required && <span class="text-red-500">*</span>}
                                      </label>
                                      {getParameterInput(param, endpointKey)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div class="text-sm text-gray-500 dark:text-gray-400">
                                No path parameters required
                              </div>
                            )}

                            {/* Query Parameters */}
                            {endpoint.parameters?.filter(p => p.in === 'query').length > 0 ? (
                              <div>
                                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Query Parameters</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {endpoint.parameters.filter(p => p.in === 'query').map(param => (
                                    <div>
                                      <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        {param.name} {param.required && <span class="text-red-500">*</span>}
                                      </label>
                                      {getParameterInput(param, endpointKey)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div class="text-sm text-gray-500 dark:text-gray-400">
                                No query parameters required
                              </div>
                            )}

                            {/* Request Body for POST/PUT */}
                            {(endpoint.method === 'POST' || endpoint.method === 'PUT') && endpoint.requestBody && (
                              <div>
                                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Request Body</h4>
                                <sl-textarea
                                  rows="8"
                                  placeholder="Enter JSON request body..."
                                  value={requestData()[endpointKey]?.requestBody || getDefaultRequestBody(endpoint)}
                                  onSlInput={(e) => updateRequestData(endpointKey, {
                                    ...requestData()[endpointKey],
                                    requestBody: e.target.value
                                  })}
                                />
                              </div>
                            )}

                            {/* Execute Button */}
                            <div class="flex items-center gap-2">
                              <sl-button
                                variant="primary"
                                size="small"
                                loading={isLoading}
                                onClick={() => executeRequest(endpoint)}
                              >
                                {isLoading ? 'Executing...' : `Try ${endpoint.method}`}
                              </sl-button>
                              
                              {response && (
                                <sl-badge variant={response.error ? 'danger' : 'success'}>
                                  {response.error ? 'Error' : `Status: ${response.status}`}
                                </sl-badge>
                              )}
                            </div>

                            {/* Response */}
                            {response && (
                              <div>
                                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Response</h4>
                                <sl-textarea
                                  rows="8"
                                  readonly
                                  value={formatResponse(response)}
                                />
                              </div>
                            )}
                          </div>
                        </sl-details>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }; 