import { onMount, onCleanup } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';

export const ShoelaceDrawer = ({
  openState,
  label,
  onRequestClose,
  children,
  placement = 'start',
  id = null,
  ...drawerProps
}) => {
  const [isOpen, setIsOpen] = openState;
  
  // Generate unique ID if not provided
  const drawerId = id || `shoelace-drawer-${Math.random().toString(36).slice(2)}`;
  
  let drawerRef;
  
  onMount(() => {
    if (!drawerRef) return;
    
    // Handle drawer close events
    const handleAfterHide = (event) => {
      if (event.target === drawerRef) {
        setIsOpen(false);
      }
    };
    
    // Handle request-close events (X button, escape key, clicking outside)
    const handleRequestClose = (event) => {
      if (event.target === drawerRef) {
        // Call custom onRequestClose handler if provided
        if (onRequestClose) {
          onRequestClose(event);
        }
        
        // Prevent closing if any select dropdown is currently open
        const openSelect = document.querySelector('sl-select[open]');
        if (openSelect) {
          event.preventDefault();
          return;
        }
        
        // Allow the drawer to close
        setIsOpen(false);
      }
    };
    
    // Add event listeners
    drawerRef.addEventListener("sl-after-hide", handleAfterHide);
    drawerRef.addEventListener("sl-request-close", handleRequestClose);
    
    // Cleanup event listeners on component unmount
    onCleanup(() => {
      if (drawerRef) {
        drawerRef.removeEventListener("sl-after-hide", handleAfterHide);
        drawerRef.removeEventListener("sl-request-close", handleRequestClose);
      }
    });
  });

  return (
    <sl-drawer 
      ref={drawerRef}
      id={drawerId} 
      label={label} 
      open={isOpen()}
      placement={placement}
      {...drawerProps}
    >
      {children}
    </sl-drawer>
  );
}; 