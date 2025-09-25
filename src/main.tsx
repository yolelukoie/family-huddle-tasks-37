import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

function RealtimeMount() {
  useRealtimeNotifications();    // runs once for the whole app life
  return null;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
