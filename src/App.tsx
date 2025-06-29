import { useEffect } from 'react';
import './App.css';
import { onKeydown, removeHotkeyOverlays } from './hotkey';
import { browser } from './service/browser';
import { useHotkey } from './hotkey_hook';

function App() {

  useHotkey("x", () => console.log('MEWWWWWWWW'), { allowRepeat: true });
  useEffect(() => {

    addListeners(browser);

    function addListeners(target) {
      target.addEventListener("keydown", onKeydown);
      target.addEventListener("keyup", removeHotkeyOverlays);
      target.addEventListener("blur", removeHotkeyOverlays);
      target.addEventListener("click", removeHotkeyOverlays);
    }
  }, [])

  return (
    <>
      <div>

        <button onClick={() => console.log("🚀 ~ onClick ~ clicked")} data-hotkey="x">welcome to yemen</button>
      </div>
    </>
  )
}

export default App
