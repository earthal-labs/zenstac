/**
 * DataTable - a generic table component
 * @param {Object[]} columns - [{ key, label, render?, width?, thStyle?, tdStyle? }]
 * @param {Object[]} data - array of row objects
 * @param {boolean} loading - loading state
 * @param {string|JSX.Element} empty - empty state message or element
 * @param {function} onRowClick - function(row) called when a row is clicked
 * @param {string} className - additional class for the table
 */
export const DataTable = ({ columns, data, loading, empty, onRowClick, className = '' }) => {
  
  return (
    <div class={`data-table-wrapper ${className}`}>
      <table class="w-full border-collapse bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
        <thead class="bg-gray-50 dark:bg-slate-700 border-b-2 border-gray-200 dark:border-gray-600">
          <tr>
            {columns.map(col => (
              <th 
                class={`p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide ${col.thClass || 'text-left'}`}
                style={`${col.width ? `width:${col.width};` : ''}${col.thStyle || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td 
                colspan={columns.length} 
                class="p-4 text-center text-gray-600 dark:text-gray-300"
              >
                Loading...
              </td>
            </tr>
          ) : (!data || data.length === 0) ? (
            <tr>
              <td 
                colspan={columns.length} 
                class="p-4 text-center text-gray-600 dark:text-gray-300"
              >
                {empty || 'No data'}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                class={`table-row border-b border-gray-100 dark:border-gray-700 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700' : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td 
                    class="p-4 align-top"
                    style={`${col.width ? `width:${col.width};` : ''}${col.tdStyle || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}; 