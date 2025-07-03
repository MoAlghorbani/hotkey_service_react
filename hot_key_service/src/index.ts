// Export the core functionality
export { onKeydown, removeHotkeyOverlays, add } from "./hotkey";
export { useHotkey } from "./hotkey_hook";
export type { HotkeyCallback, HotkeyOptions } from "./hotkey";

// Import React hooks and necessary functions
import { useEffect } from "react";
import { onKeydown, removeHotkeyOverlays } from "./hotkey";

/**
 * Adds all necessary event listeners to the specified target
 * to enable hotkey functionality
 * 
 * @param target - The target element to attach listeners to (defaults to window)
 */
export function addHotkeyListeners(target: Window = window): void {
  target.addEventListener("keydown", onKeydown);
  target.addEventListener("keyup", removeHotkeyOverlays);
  target.addEventListener("blur", removeHotkeyOverlays);
  target.addEventListener("click", removeHotkeyOverlays);
}

/**
 * Removes all hotkey event listeners from the specified target
 * 
 * @param target - The target element to remove listeners from (defaults to window)
 */
export function removeHotkeyListeners(target: Window = window): void {
  target.removeEventListener("keydown", onKeydown);
  target.removeEventListener("keyup", removeHotkeyOverlays);
  target.removeEventListener("blur", removeHotkeyOverlays);
  target.removeEventListener("click", removeHotkeyOverlays);
}

/**
 * React hook that automatically sets up and cleans up hotkey listeners
 * when the component mounts and unmounts
 * 
 * @param target - The target element to attach listeners to (defaults to window)
 */
export function useHotkeyListeners(target: Window = window): void {
  useEffect(() => {
    addHotkeyListeners(target);
    
    return () => {
      removeHotkeyListeners(target);
    };
  }, [target]);
}
