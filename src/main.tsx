import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { configureStatusBar } from './lib/statusBar'
import { analytics } from './lib/analytics'

// Configure native status bar on app start
configureStatusBar();
analytics.init();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
