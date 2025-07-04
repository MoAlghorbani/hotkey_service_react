import { getVisibleElements, isMacOS } from "./utils";
/**
 * Defines the context for a hotkey callback.
 */
interface HotkeyCallbackContext {
    area: HTMLElement;
    target: EventTarget | null;
}
export type HotkeyCallback = (context: HotkeyCallbackContext) => void;
export interface HotkeyOptions {
    allowRepeat?: boolean;
    bypassEditableProtection?: boolean;
    global?: boolean;
    area?: () => HTMLElement;
    isAvailable?: () => boolean;
}

interface HotkeyRegistration extends HotkeyOptions {
    hotkey: string;
    callback: HotkeyCallback;
    activeElement: HTMLElement | null;
}
interface DispatchInfos {
    activeElement: HTMLElement | Document;
    hotkey: string;
    isRepeated: boolean;
    target: EventTarget | null;
    shouldProtectEditable: boolean;
}

const ALPHANUM_KEYS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const NAV_KEYS = [
    "arrowleft",
    "arrowright",
    "arrowup",
    "arrowdown",
    "pageup",
    "pagedown",
    "home",
    "end",
    "backspace",
    "enter",
    "tab",
    "delete",
    "space",
];
const MODIFIERS = ["alt", "control", "shift"];
const AUTHORIZED_KEYS = [...ALPHANUM_KEYS, ...NAV_KEYS, "escape"];
const registrations = new Map<number, HotkeyRegistration>();
const overlayModifier = "alt"
let nextToken = 0;
let activeElems: (HTMLElement | Document)[] = [document];
let overlaysVisible = false;

const activeElement = activeElems[activeElems.length - 1];
function getActiveHotkey(ev: KeyboardEvent): string {
    if (!ev.key) {
        // Chrome may trigger incomplete keydown events under certain circumstances.
        // E.g. when using browser built-in autocomplete on an input.
        // See https://stackoverflow.com/questions/59534586/google-chrome-fires-keydown-event-when-form-autocomplete
        return "";
    }
    if (ev.isComposing) {
        // This case happens with an IME for example: we let it handle all key events.
        return "";
    }
    const hotkey = [];

    // ------- Modifiers -------
    // Modifiers are pushed in ascending order to the hotkey.
    if (isMacOS() ? ev.ctrlKey : ev.altKey) {
        hotkey.push("alt");
    }
    if (isMacOS() ? ev.metaKey : ev.ctrlKey) {
        hotkey.push("control");
    }
    if (ev.shiftKey) {
        hotkey.push("shift");
    }

    // ------- Key -------
    let key = ev.key.toLowerCase();

    // The browser space is natively " ", we want "space" for esthetic reasons
    if (key === " ") {
        key = "space";
    }

    // Identify if the user has tapped on the number keys above the text keys.
    if (ev.code && ev.code.indexOf("Digit") === 0) {
        key = ev.code.slice(-1);
    }
    // Prefer physical keys for non-latin keyboard layout.
    if (!AUTHORIZED_KEYS.includes(key) && ev.code && ev.code.indexOf("Key") === 0) {
        key = ev.code.slice(-1).toLowerCase();
    }
    // Make sure we do not duplicate a modifier key
    if (!MODIFIERS.includes(key)) {
        hotkey.push(key);
    }

    return hotkey.join("+");
}
export function onKeydown(event: KeyboardEvent) {

    if (event.code && event.code.indexOf("Numpad") === 0 && /^\d$/.test(event.key)) {
        // Ignore all number keys from the Keypad because of a certain input method
        // of (advance-)ASCII characters on Windows OS: ALT+[numerical code from keypad]
        // See https://support.microsoft.com/en-us/office/insert-ascii-or-unicode-latin-based-symbols-and-characters-d13f58d3-7bcb-44a7-a4d5-972ee12e50e0#bm1
        return;
    }

    const hotkey = getActiveHotkey(event);
    if (!hotkey) {
        return;
    }
    const activeElement = activeElems[activeElems.length - 1];

    // Replace all [accesskey] attrs by [data-hotkey] on all elements.
    // This is needed to take over on the default accesskey behavior
    // and also to avoid any conflict with it.
    const elementsWithAccessKey = document.querySelectorAll("[accesskey]");
    for (const el of elementsWithAccessKey) {
        if (el instanceof HTMLElement) {
            // accessKey is always a string, but TypeScript might see it as possibly undefined
            const accessKey = el.accessKey || '';
            el.dataset.hotkey = accessKey;
            el.removeAttribute("accesskey");
        }
    }

    // Special case: open hotkey overlays
    if (!overlaysVisible && hotkey === overlayModifier) {
        addHotkeyOverlays(activeElement);
        event.preventDefault();
        return;
    }

    // Is the pressed key NOT whitelisted ?
    const singleKey = hotkey.split("+").pop() || '';
    if (!AUTHORIZED_KEYS.includes(singleKey)) {
        return;
    }

    // Protect any editable target that does not explicitly accept hotkeys
    // NB: except for ESC, which is always allowed as hotkey in editables.
    const targetIsEditable =
        event.target instanceof HTMLElement &&
        (/input|textarea/i.test(event.target.tagName) || event.target.isContentEditable) &&
        !event.target.matches("input[type=checkbox], input[type=radio]");
    const shouldProtectEditable =
        targetIsEditable && !event.target.dataset.allowHotkeys && singleKey !== "escape";

    // Finally, prepare and dispatch.
    const infos = {
        activeElement,
        hotkey,
        isRepeated: event.repeat,
        target: event.target,
        shouldProtectEditable,
    };
    // Type assertion needed because activeElement might be Document
    const typedInfos: DispatchInfos = {
        ...infos,
        activeElement: infos.activeElement instanceof HTMLElement ? infos.activeElement : document.body
    };
    const dispatched = dispatch(typedInfos);
    if (dispatched) {
        // Only if event has been handled.
        // Purpose: prevent browser defaults
        event.preventDefault();
        // Purpose: stop other window keydown listeners (e.g. home menu)
        event.stopImmediatePropagation();
    }

    // Finally, always remove overlays at that point
    if (overlaysVisible) {
        removeHotkeyOverlays();
        event.preventDefault();
    }
}
function dispatch(infos: DispatchInfos): boolean {
    const { activeElement, hotkey, isRepeated, target, shouldProtectEditable } = infos;

    // Prepare registrations and the common filter
    const reversedRegistrations = Array.from(registrations.values()).reverse();
    const domRegistrations = getDomRegistrations(hotkey, activeElement);
    const allRegistrations = reversedRegistrations.concat(domRegistrations);

    // Find all candidates
    const candidates = allRegistrations.filter(
        (reg) =>
            reg.hotkey === hotkey &&
            (reg.allowRepeat || !isRepeated) &&
            (reg.bypassEditableProtection || !shouldProtectEditable) &&
            (reg.global || reg.activeElement === activeElement) &&
            (!reg.isAvailable || reg.isAvailable()) &&
            (!reg.area ||
                (target instanceof Node && reg.area && reg.area().contains(target)))
    );

    // First candidate
    let winner = candidates.shift();
    if (winner && winner.area) {
        // If there is an area, find the closest one
        for (const candidate of candidates.filter((c) => Boolean(c.area))) {
            const candidateArea = candidate.area ? candidate.area() : null;
            const winnerArea = winner.area ? winner.area() : null;
            if (candidateArea && winnerArea && winnerArea.contains(candidateArea)) {
                winner = candidate;
            }
        }
    }

    // Dispatch actual hotkey to the matching registration
    if (winner) {
        winner.callback({
            area: winner.area ? winner.area() : document.body,
            target,
        });
        return true;
    }
    return false;
}
// Helper function to get DOM registrations
function getDomRegistrations(hotkey: string, activeElement: HTMLElement | Document): HotkeyRegistration[] {
    const overlayModParts = overlayModifier.split("+");
    if (!overlayModParts.every((el) => hotkey.includes(el))) {
        return [];
    }

    // Get all elements having a data-hotkey attribute  and matching
    // the actual hotkey without the overlayModifier.
    const cleanHotkey = hotkey
        .split("+")
        .filter((key) => !overlayModParts.includes(key))
        .join("+");
    
    // We need to ensure we're passing an Element to getVisibleElements
    const elementForSearch = activeElement instanceof Document ? document.body : activeElement;
    
    // Cast to HTMLElement[] since we know these elements will have click method
    const elems = getVisibleElements(elementForSearch, `[data-hotkey='${cleanHotkey}' i]`) as HTMLElement[];
    
    return elems.map((el) => ({
        hotkey,
        // Ensure activeElement is HTMLElement or null for HotkeyRegistration
        activeElement: activeElement instanceof HTMLElement ? activeElement : null,
        bypassEditableProtection: true,
        callback: () => {
            if (document.activeElement && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            setTimeout(() => {
                if ('click' in el) {
                    el.click();
                }
            });
        },
    }));
}
function addHotkeyOverlays(activeElement: HTMLElement | Document) {
    // We need to ensure we're passing an Element to getVisibleElements
    const elementForSearch = activeElement instanceof Document ? document.body : activeElement;
    
    // Cast to HTMLElement[] since we know these elements will have dataset property
    const visibleElements = getVisibleElements(elementForSearch, "[data-hotkey]:not(:disabled)") as HTMLElement[];
    for (const el of visibleElements) {
        const hotkey = el.dataset.hotkey || '';
        const overlay = document.createElement("div");
        overlay.classList.add(
            "o_web_hotkey_overlay",
        ); 
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.bottom = "0";
        overlay.style.left = "0";
        overlay.style.right = "0";
        overlay.style.display = "flex";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.margin = "0";
        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        overlay.style.fontSize = "1rem";
        
        const overlayKbd = document.createElement("kbd");
        overlayKbd.style.fontSize = "1rem";
        overlayKbd.appendChild(document.createTextNode(hotkey.toUpperCase()));
        overlay.appendChild(overlayKbd);

        let overlayParent: HTMLElement | null;
        if (el.tagName.toUpperCase() === "INPUT") {
            // special case for the search input that has an access key
            // defined. We cannot set the overlay on the input itself,
            // only on its parent.
            overlayParent = el.parentElement;
        } else {
            overlayParent = el;
        }

        // Make sure overlayParent exists and is an HTMLElement before accessing style
        if (overlayParent instanceof HTMLElement) {
            if (overlayParent.style.position !== "absolute") {
                overlayParent.style.position = "relative";
            }
            overlayParent.appendChild(overlay);
        }
    }
    overlaysVisible = true;
}
export function removeHotkeyOverlays() {
    for (const overlay of document.querySelectorAll(".o_web_hotkey_overlay")) {
        overlay.remove();
    }
    overlaysVisible = false;
}

function registerHotkey(hotkey: string, callback: HotkeyCallback, options: HotkeyOptions = {}): number {
    // Validate some informations
    if (!hotkey || hotkey.length === 0) {
        throw new Error("You must specify an hotkey when registering a registration.");
    }

    if (!callback || typeof callback !== "function") {
        throw new Error(
            "You must specify a callback function when registering a registration."
        );
    }

    /**
     * An hotkey must comply to these rules:
     *  - all parts are whitelisted
     *  - single key part comes last
     *  - each part is separated by the dash character: "+"
     */
    const keys = hotkey
        .toLowerCase()
        .split("+")
        .filter((k) => !MODIFIERS.includes(k));
    if (keys.some((k) => !AUTHORIZED_KEYS.includes(k))) {
        throw new Error(
            `You are trying to subscribe for an hotkey ('${hotkey}')
    that contains parts not whitelisted: ${keys.join(", ")}`
        );
    } else if (keys.length > 1) {
        throw new Error(
            `You are trying to subscribe for an hotkey ('${hotkey}')
    that contains more than one single key part: ${keys.join("+")}`
        );
    }

    // Add registration
    const token = nextToken++;
    // /** @type {HotkeyRegistration} */
    const registration: HotkeyRegistration = {
        hotkey: hotkey.toLowerCase(),
        callback,
        activeElement: null,
        allowRepeat: options && options.allowRepeat,
        bypassEditableProtection: options && options.bypassEditableProtection,
        global: options && options.global,
        area: options && options.area,
        isAvailable: options && options.isAvailable,
    };

    // Due to the way elements are mounted in the DOM by Owl (bottom-to-top),
    // we need to wait the next micro task tick to set the context owner of the registration.
    Promise.resolve().then(() => {
        // Ensure activeElement is HTMLElement or null
        // This fixes the TypeScript error about Document not being assignable to HTMLElement
        registration.activeElement = activeElement instanceof HTMLElement ? activeElement : document.body;
    });

    registrations.set(token, registration);
    return token;
}
function unregisterHotkey(token: number) {
    registrations.delete(token);
}

export function add(hotkey: string, callback: HotkeyCallback, options?: HotkeyOptions) {
    const token = registerHotkey(hotkey, callback, options);
    return () => {
        unregisterHotkey(token);
    };
}