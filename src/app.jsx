import { h } from "preact";
import Desktop from "./components/Desktop/Desktop";
import "./style.css";
export function App() {
  if (navigator.userAgent.includes("PlayStation 4")) {
    document.body.classList.add('ps4');
  } else if (navigator.userAgent.includes("PlayStation 5")) {
    document.body.classList.add('ps5');
  }

  return <Desktop />;
}