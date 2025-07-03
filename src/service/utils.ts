// Direct window access instead of browser abstraction
/**
 * rough approximation of a visible element. not perfect (does not take into
 * account opacity = 0 for example), but good enough for our purpose
 *
 * @param {Element} el - Element, Document, Window or null to check visibility
 * @returns {boolean} - Whether the element is visible
 */
export function isVisible(el: Element | Window | Document): boolean {
    if (el === document || el === window) {
        return true;
    }
    if (!el) {
        return false;
    }
    let _isVisible = false;
    if ("offsetWidth" in el && "offsetHeight" in el) {
        // Use type assertion to tell TypeScript this is an HTMLElement
        const htmlEl = el as HTMLElement;
        _isVisible = htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0;
    } else if ("getBoundingClientRect" in el) {
        // for example, svgelements
        // Element interface has getBoundingClientRect
        const rect = (el as Element).getBoundingClientRect();
        _isVisible = rect.width > 0 && rect.height > 0;
    }
    if (!_isVisible && "nodeType" in el && getComputedStyle(el as Element).display === "contents") {
        // Only Element has children property
        const elemEl = el as Element;
        for (const child of elemEl.children) {
            if (isVisible(child)) {
                return true;
            }
        }
    }
    return _isVisible;
}

/**
 * @param {Element} activeElement
 * @param {String} selector
 * @returns all selected and visible elements present in the activeElement
 */
export function getVisibleElements(activeElement:Element, selector:string) {
    const visibleElements = [];
    /** @type {NodeListOf<HTMLElement>} */
    const elements = activeElement.querySelectorAll(selector);
    for (const el of elements) {
        if (isVisible(el)) {
            visibleElements.push(el);
        }
    }
    return visibleElements;
}
export function isMacOS() {
    return /Mac/i.test(window.navigator.userAgent);
}