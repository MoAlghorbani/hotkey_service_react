import { useEffect, useCallback } from "react";
import { add, type HotkeyCallback, type HotkeyOptions } from "./hotkey";

/**
 * This hook will register/unregister the given registration
 * when the caller component will mount/unmount.
 * 
 * @param hotkey - The hotkey combination to register (e.g., "alt+s")
 * @param callback - The function to call when the hotkey is triggered
 * @param options - Additional options for the hotkey registration
 * @returns void
 */
export function useHotkey(hotkey: string, callback: HotkeyCallback, options?: HotkeyOptions): void {
    // Memoize the callback to maintain reference stability
    const stableCallback = useCallback(callback, [callback]);
    
    useEffect(() => {
        // Register the hotkey and get the cleanup function
        const cleanup = add(hotkey, stableCallback, options);
        
        // Return the cleanup function to unregister when unmounting
        return cleanup;
    }, [hotkey, stableCallback, options]);
}
