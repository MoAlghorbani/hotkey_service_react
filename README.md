# Hot Key Service

[![npm version](https://img.shields.io/npm/v/hot_key_service.svg)](https://www.npmjs.com/package/hot_key_service)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A lightweight, flexible hotkey management library for React applications. This package provides an easy way to register keyboard shortcuts in your React components with support for modifier keys, visual overlays, and protection for editable fields.

## Features

- 🔑 Simple API for registering keyboard shortcuts
- ⌨️ Support for modifier keys (Alt, Control, Shift)
- 👁️ Visual overlay to display available hotkeys
- 🛡️ Protection for editable fields (inputs, textareas)
- 🪝 React hooks for easy integration
- 🌐 Cross-platform support with automatic macOS detection
- 🧩 HTML attribute-based hotkey registration

## Installation

```bash
npm install hot_key_service
# or
yarn add hot_key_service
```

## Basic Usage

### Using the React Hook

The simplest way to use this library is with the `useHotkey` hook:

```jsx
import React from 'react';
import { useHotkey } from 'hot_key_service';

function MyComponent() {
  useHotkey('control+s', () => {
    console.log('Saved!');
    // Your save logic here
  });
  
  return <div>Press Ctrl+S to save</div>;
}
```

### Managing Event Listeners

For components that need to manage hotkey event listeners:

```jsx
import React from 'react';
import { useHotkeyListeners } from 'hot_key_service';

function App() {
  // Automatically adds listeners on mount and removes them on unmount
  useHotkeyListeners();
  
  return (
    <div className="app">
      {/* Your app content */}
    </div>
  );
}
```

### Using data-hotkey Attribute

You can also use the `data-hotkey` attribute on HTML elements to register hotkeys declaratively:

```jsx
import React from 'react';
import { useHotkeyListeners } from 'hot_key_service';

function MyComponent() {
  // Make sure to add the hotkey listeners
  useHotkeyListeners();
  
  return (
    <div>
      {/* The button will be clicked when 's' is pressed */}
      <button data-hotkey="s" onClick={() => console.log('Save clicked')}>
        Save
      </button>
      
      {/* The button will be clicked when 'control+n' is pressed */}
      <button data-hotkey="control+n" onClick={() => console.log('New item')}>
        New Item
      </button>
    </div>
  );
}
```

## API Reference

### Hooks

#### `useHotkey(hotkey, callback, options?)`

Registers a hotkey in a React component.

- **hotkey**: String - The hotkey to register (e.g., 'control+s', 'shift+a')
- **callback**: Function - The function to call when the hotkey is triggered
- **options**: Object (optional) - Configuration options

#### `useHotkeyListeners(target?)`

Adds and removes hotkey event listeners automatically.

- **target**: Window (optional) - The target window to attach listeners to (defaults to current window)

### Functions

#### `addHotkeyListeners(target?)`

Adds keyboard event listeners to the specified target.

- **target**: Window (optional) - The target window (defaults to current window)

#### `removeHotkeyListeners(target?)`

Removes keyboard event listeners from the specified target.

- **target**: Window (optional) - The target window (defaults to current window)

### HTML Attributes

#### `data-hotkey`

Add this attribute to any clickable HTML element to make it respond to a hotkey:

```html
<button data-hotkey="a">Button A</button>
<button data-hotkey="control+b">Button B</button>
```

When the specified hotkey is pressed, the element will be automatically clicked.

### Options for useHotkey

The following options can be passed when using the `useHotkey` hook:

- **allowRepeat**: Boolean - Whether to trigger the callback on key repeat (default: false)
- **bypassEditableProtection**: Boolean - Whether to trigger the callback when focus is in an editable field (default: false)
- **global**: Boolean - Whether the hotkey should work globally across all elements (default: false)
- **area**: Function - A function that returns the HTMLElement within which the hotkey should be active
- **isAvailable**: Function - A function that returns a boolean indicating whether the hotkey should be active

## Supported Keys

### Alphanumeric Keys
- All letters (a-z)
- All numbers (0-9)

### Navigation Keys
- Arrow keys (arrowleft, arrowright, arrowup, arrowdown)
- pageup, pagedown
- home, end
- backspace, enter, tab, delete
- space
- escape

### Modifier Keys
- alt
- control
- shift

## Limitations

- Function keys (F1-F12) are not supported
- Special characters (!@#$%^&*()_+{}|:"<>? etc.) are not supported
- Multiple non-modifier keys in a single hotkey (e.g., 'a+b') are not supported
- Numpad keys with ALT modifier on Windows are ignored (to avoid conflicts with ASCII character input)

## Visual Overlay

Press and hold the Alt key to display a visual overlay showing all available hotkeys in the current context.

## Considerations

1. **Editable Fields**: By default, hotkeys are not triggered when focus is in an editable field (input, textarea, contentEditable). Use the `bypassEditableProtection` option if you need to override this behavior.

2. **Platform Differences**: The library automatically detects macOS and adjusts modifier keys accordingly (Command key on Mac is mapped to Control).

3. **Conflicts**: Be careful not to register hotkeys that might conflict with browser or system shortcuts.

4. **Performance**: Registering a large number of hotkeys might impact performance. Consider using the `isAvailable` option to conditionally enable hotkeys based on application state.

5. **Accessibility**: Ensure that all functionality accessible via hotkeys is also accessible through standard UI controls for users who cannot use keyboard shortcuts.

6. **Using data-hotkey**: When using the `data-hotkey` attribute:
   - Make sure to call `useHotkeyListeners()` in your root component
   - Elements with `data-hotkey` must be visible to be triggered
   - The hotkey will automatically click the element when pressed
   - You can use the Alt key to see all available hotkeys in the UI

## Browser Compatibility

This library works in all modern browsers (Chrome, Firefox, Safari, Edge).

## License

ISC
