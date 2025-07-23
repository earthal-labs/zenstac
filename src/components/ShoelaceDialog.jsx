import { onMount, onCleanup } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

export const ShoelaceDialog = ({
  openState,
  label,
  onRequestClose,
  children,
  modal = false,
  id = null,
  ...dialogProps
}) => {
  const [isOpen, setIsOpen] = openState;
  
  // Generate unique ID if not provided
  const dialogId = id || `shoelace-dialog-${Math.random().toString(36).slice(2)}`;
  
  let dialogRef;
  
  onMount(() => {
    if (!dialogRef) return;
    

    
    // Handle dialog close events
    const handleAfterHide = (event) => {
  
      if (event.target === dialogRef) {
        setIsOpen(false);
      }
    };
    
    // Handle request-close events (X button, escape key, clicking outside)
    const handleRequestClose = (event) => {
  
      if (event.target === dialogRef) {
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
        
        // Allow the dialog to close
        setIsOpen(false);
      }
    };
    
    // Add event listeners
    dialogRef.addEventListener("sl-after-hide", handleAfterHide);
    dialogRef.addEventListener("sl-request-close", handleRequestClose);
    
    // Cleanup event listeners on component unmount
    onCleanup(() => {
      if (dialogRef) {
        dialogRef.removeEventListener("sl-after-hide", handleAfterHide);
        dialogRef.removeEventListener("sl-request-close", handleRequestClose);
      }
    });
  });

  return (
    <sl-dialog 
      ref={dialogRef}
      id={dialogId} 
      label={label} 
      open={isOpen()}
      {...dialogProps}
    >
      {children}
    </sl-dialog>
  );
}; 