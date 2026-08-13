import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfigProvider, theme } from 'antd'
import { BrowserRouter } from 'react-router-dom'

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



