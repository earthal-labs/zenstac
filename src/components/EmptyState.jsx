import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

export const EmptyState = ({ icon, iconSize = '4rem', title, description, actionButton = null }) => {
  return (
    <div class="flex flex-col items-center justify-center p-12 text-center text-gray-600 dark:text-gray-300">
      {/* Icon */}
      <div class="text-gray-400 dark:text-gray-500 mb-4">
        <sl-icon 
          name={icon} 
          style={`font-size: ${iconSize};`}
        />
      </div>
      
      {/* Title */}
      {title && (
        <h3 class="m-0 mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      
      {/* Description */}
      {description && (
        <p class="m-0 mb-6 text-sm leading-relaxed max-w-md">
          {description}
        </p>
      )}
      
      {/* Action Button */}
      {actionButton && (
        <div class="mt-4">
          {actionButton}
        </div>
      )}
    </div>
  );
}; 