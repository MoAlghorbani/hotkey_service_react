import { useEffect } from "react";
import { add, type HotkeyCallback, type HotkeyOptions } from "./hotkey";


/**
 * This hook will register/unregister the given registration
 * when the caller component will mount/unmount.
 */
export function useHotkey(hotkey: string, callback: HotkeyCallback, options?: HotkeyOptions) {

    useEffect(() => {
        add(hotkey, callback, options)
    }, [])

}
