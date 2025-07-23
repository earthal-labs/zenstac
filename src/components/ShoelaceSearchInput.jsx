import { onMount, onCleanup } from 'solid-js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/input/input.js';

export const ShoelaceSearchInput = ({ 
  id, 
  placeholder, 
  valueState, 
  onInput, 
  size = "medium",
  clearable = true,
  type = "search",
  style = ""
}) => {
  let inputRef;
  const [value, setValue] = valueState;

  onMount(() => {
    if (inputRef) {
      const handleClear = () => {
        setValue("");
        if (onInput) {
          onInput("");
        }
      };

      inputRef.addEventListener('sl-clear', handleClear);
      
      onCleanup(() => {
        if (inputRef) {
          inputRef.removeEventListener('sl-clear', handleClear);
        }
      });
    }
  });

  return (
    <sl-input
      ref={inputRef}
      id={id}
      type={type}
      placeholder={placeholder}
      clearable={clearable}
      size={size}
      style={style}
      value={value()}
      onInput={(e) => {
        const newValue = e.target.value;
        setValue(newValue);
        if (onInput) {
          onInput(newValue);
        }
      }}
    />
  );
}; 