
interface Browser {
    addEventListener: typeof window.addEventListener;
    navigator: typeof window.navigator;
}
export const browser: Browser = {
    addEventListener: window.addEventListener.bind(window),
    navigator: window.navigator
};
