import { useEffect } from 'react';
import './App.css';
import { onKeydown, removeHotkeyOverlays } from './hotkey';

function App() {

  function addListeners(target: Window) {
    target.addEventListener("keydown", onKeydown);
    target.addEventListener("keyup", removeHotkeyOverlays);
    target.addEventListener("blur", removeHotkeyOverlays);
    target.addEventListener("click", removeHotkeyOverlays);
  }
  useEffect(() => {
    addListeners(window);
  }, [])

  return (
    <>
      <div>
      </div>
    </>
  )
}

export default App
