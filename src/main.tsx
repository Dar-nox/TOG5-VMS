import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/theme.css";
// The stylesheet the old screens still depend on. It is unlayered, so it wins
// over Tailwind's layers and the not-yet-rebuilt screens keep rendering as they
// do today. It goes when the last of them is converted.
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
