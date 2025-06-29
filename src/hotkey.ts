import { getVisibleElements, isMacOS } from "./service/utils";

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
const registrations = new Map();
const overlayModifier = "alt"
let nextToken = 0;
let activeElems = [document];
let overlaysVisible = false;

const activeElement = activeElems[activeElems.length - 1];
function getActiveHotkey(ev) {
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

export function onKeydown(event) {

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


    // Do not dispatch if UI is blocked
    // if (isBlocked) {
    //   return;
    // }

    // Replace all [accesskey] attrs by [data-hotkey] on all elements.
    // This is needed to take over on the default accesskey behavior
    // and also to avoid any conflict with it.
    const elementsWithAccessKey = document.querySelectorAll("[accesskey]");
    for (const el of elementsWithAccessKey) {
        if (el instanceof HTMLElement) {
            el.dataset.hotkey = el.accessKey;
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
    const singleKey = hotkey.split("+").pop();
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
    const dispatched = dispatch(infos);
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
function addHotkeyOverlays(activeElement) {

    for (const el of getVisibleElements(activeElement, "[data-hotkey]:not(:disabled)")) {
        const hotkey = el.dataset.hotkey;
        const overlay = document.createElement("div");
        overlay.classList.add(
            "o_web_hotkey_overlay",
            "position-absolute",
            "top-0",
            "bottom-0",
            "start-0",
            "end-0",
            "d-flex",
            "justify-content-center",
            "align-items-center",
            "m-0",
            "bg-black-50",
            "h6"
        );
        const overlayKbd = document.createElement("kbd");
        overlayKbd.className = "small";
        overlayKbd.appendChild(document.createTextNode(hotkey.toUpperCase()));
        overlay.appendChild(overlayKbd);

        let overlayParent;
        if (el.tagName.toUpperCase() === "INPUT") {
            // special case for the search input that has an access key
            // defined. We cannot set the overlay on the input itself,
            // only on its parent.
            overlayParent = el.parentElement;
        } else {
            overlayParent = el;
        }

        if (overlayParent.style.position !== "absolute") {
            overlayParent.style.position = "relative";
        }
        overlayParent.appendChild(overlay);
    }
    overlaysVisible = true;
}
export function removeHotkeyOverlays() {
    for (const overlay of document.querySelectorAll(".o_web_hotkey_overlay")) {
        overlay.remove();
    }
    overlaysVisible = false;
}
function dispatch(infos) {
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
                (target instanceof Node && reg.area() && reg.area().contains(target)))
    );

    // First candidate
    let winner = candidates.shift();
    if (winner && winner.area) {
        // If there is an area, find the closest one
        for (const candidate of candidates.filter((c) => Boolean(c.area))) {
            if (candidate.area() && winner.area().contains(candidate.area())) {
                winner = candidate;
            }
        }
    }

    // Dispatch actual hotkey to the matching registration
    if (winner) {
        winner.callback({
            area: winner.area && winner.area(),
            target,
        });
        return true;
    }
    return false;
}
function getDomRegistrations(hotkey, activeElement) {
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
    const elems = getVisibleElements(activeElement, `[data-hotkey='${cleanHotkey}' i]`);
    return elems.map((el) => ({
        hotkey,
        activeElement,
        bypassEditableProtection: true,
        callback: () => {
            if (document.activeElement) {
                document.activeElement.blur();
            }
            setTimeout(() => el.click());
        },
    }));
}
function registerHotkey(hotkey, callback, options = {}) {
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
    /** @type {HotkeyRegistration} */
    const registration = {
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
        registration.activeElement = activeElement;
    });

    registrations.set(token, registration);
    return token;
}
function unregisterHotkey(token) {
    registrations.delete(token);
}

export function add(hotkey, callback, options = {}) {
    const token = registerHotkey(hotkey, callback, options);
    return () => {
        unregisterHotkey(token);
    };
}