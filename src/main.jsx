import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfigProvider, theme } from 'antd'
import { BrowserRouter } from 'react-router-dom'

// Intercept fetch and WebSocket to dynamically route requests to the correct production backend
const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string') {
    if (url.startsWith('http://localhost:5000') || url.startsWith('http://127.0.0.1:5000')) {
      url = url.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, backendUrl);
    }
  }
  return originalFetch(url, options);
};

const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
  if (typeof url === 'string') {
    if (url.includes('localhost:5000') || url.includes('127.0.0.1:5000') || url.includes(`${window.location.hostname}:5000`)) {
      const wsTarget = backendUrl.replace(/^http/, 'ws');
      url = url.replace(/^ws(s)?:\/\/[^\/]+/, wsTarget);
    }
  }
  return new OriginalWebSocket(url, protocols);
};

// ── IMPORT ALL ROLE PORTALS ──
import Guest from './AppShell.jsx'            // Master AppShell (Simulated switch orchestrator)
import GuestApp from './GuestApp.jsx'          // Guest (Public Bulletin) Portal
import UserApp from './UserApp.jsx'            // User (Citizen) Portal
import VolunteerApp from './VolunteerApp.jsx'   // Volunteer (Rescue) Portal
import WorkshopApp from './WorkshopApp.jsx'     // Workshop (Owner/Mechanic) Portal
import ManagerApp from './ManagerApp.jsx'       // Manager (Ops Control) Portal
import Admin from './App.jsx'                  // Admin (Executive) Portal

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#06b6d4', // Matches var(--cyan-400)
            colorBgBase: '#0d1721',   // Matches space-dark background
            borderRadius: 12,         // Matches design borders
            fontFamily: "'Inter', sans-serif",
          },
          components: {
            Modal: {
              contentBg: 'rgba(18, 29, 40, 0.85)',
            },
            Drawer: {
              colorBgElevated: 'rgba(18, 29, 40, 0.85)',
            },
          },
        }}
      >
        <AuthProvider>
          {/* CHOOSE THE PORTAL TO RUN BY UNCOMMENTING: */}
          <Guest /> {/* Master AppShell */}
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
)



