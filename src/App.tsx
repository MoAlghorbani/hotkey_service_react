import { useEffect, useState } from 'react'
import './App.css'
import { browser } from './service/browser';

function App() {
  useEffect(() => {

        addListeners(browser);

        function addListeners(target) {
            console.log("🚀 ~ addListeners ~ target:", target)
            // target.addEventListener("keydown", onKeydown);
            // target.addEventListener("keyup", removeHotkeyOverlays);
            // target.addEventListener("blur", removeHotkeyOverlays);
            // target.addEventListener("click", removeHotkeyOverlays);
        }
    return () => {

    }
  }, [])

  return (
    <>
      <div>
        asdasd
      </div>
    </>
  )
}

export default App
