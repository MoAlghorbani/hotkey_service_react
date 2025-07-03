/**
 * Checks if an element is visible in the DOM
 * 
 * @param el - Element, Document, Window or null to check visibility
 * @returns Whether the element is visible
 */
export function isVisible(el: Element | Window | Document | null): boolean {
    // Handle special cases
    if (!el) return false;
    if (el === document || el === window) return true;
    
    // Now we know it's an Element
    const element = el as Element;
    
    // Check dimensions using the most appropriate method
    if ('offsetWidth' in element && 'offsetHeight' in element) {
        const htmlEl = element as HTMLElement;
        if (htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0) return true;
    } else if ('getBoundingClientRect' in element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return true;
    }
    
    // Check for elements with display: contents
    if (getComputedStyle(element).display === 'contents') {
        return Array.from(element.children).some(child => isVisible(child));
    }
    
    return false;
}

/**
 * Returns all visible elements matching a selector within a parent element
 * 
 * @param activeElement - Parent element to search within
 * @param selector - CSS selector to match elements
 * @returns Array of visible elements matching the selector
 */
export function getVisibleElements(activeElement: Element, selector: string): HTMLElement[] {
    return Array.from(activeElement.querySelectorAll<HTMLElement>(selector))
        .filter(isVisible);
}

// Cache the platform detection result
const IS_MAC_OS = typeof window !== 'undefined' ? /Mac/i.test(window.navigator.userAgent) : false;

/**
 * Detects if the current platform is macOS
 * 
 * @returns True if the current platform is macOS
 */
export function isMacOS(): boolean {
    return IS_MAC_OS;
}