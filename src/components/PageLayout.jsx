import { ShoelaceSearchInput } from "./ShoelaceSearchInput.jsx";

export const PageLayout = ({ 
  title, 
  searchQuery, 
  setSearchQuery, 
  onRefresh, 
  children,
  actionButton,
  searchPlaceholder = "Search...",
  showSearch = true
}) => {
  // Handle searchQuery - it could be a signal function or a value
  const getSearchValue = typeof searchQuery === 'function' ? searchQuery : () => searchQuery;

  return (
    <div class="space-y-6">
      {/* Header Section */}
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-0">{title}</h2>
        </div>
        <div class="flex items-center gap-3">
          {actionButton}
          {showSearch && (
            <div class="w-80">
              <ShoelaceSearchInput
                id={`${title.toLowerCase().replace(/\s+/g, '-')}-search-input`}
                placeholder={searchPlaceholder}
                valueState={[getSearchValue, setSearchQuery]}
                size="small"
                onInput={(value) => {
                  setSearchQuery(value);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}; 