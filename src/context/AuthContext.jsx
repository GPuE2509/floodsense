import React, { createContext, useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const getInitialState = () => {
    try {
      const stored = sessionStorage.getItem('auth_data') || localStorage.getItem('auth_data');
      if (stored && stored !== 'undefined') return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse auth_data', e);
    }
    return null;
  };

  const initialState = getInitialState();

  const [isLoggedIn, setIsLoggedIn] = useState(initialState?.isLoggedIn || false);
  const [role, setRole] = useState(initialState?.role || 'guest'); // 'guest' | 'user' | 'workshop' | 'volunteer' | 'manager' | 'admin'
  const [userName, setUserName] = useState(initialState?.userName || '');
  const [workshopName, setWorkshopName] = useState(initialState?.workshopName || null);
  const [rememberMe, setRememberMeState] = useState(initialState?.rememberMe ?? true);
  const [avatarUrl, setAvatarUrl] = useState(initialState?.avatarUrl || '');

  useEffect(() => {
    if (role === 'guest') {
      localStorage.removeItem('auth_data');
      sessionStorage.removeItem('auth_data');
    } else {
      const dataStr = JSON.stringify({ isLoggedIn, role, userName, workshopName, rememberMe, avatarUrl });
      if (rememberMe) {
        localStorage.setItem('auth_data', dataStr);
        sessionStorage.removeItem('auth_data');
      } else {
        sessionStorage.setItem('auth_data', dataStr);
        localStorage.removeItem('auth_data');
      }
    }
  }, [isLoggedIn, role, userName, workshopName, rememberMe, avatarUrl]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isLoggedIn) return;
      try {
        const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        if (!token) return;
        
        const response = await apiService.get('/auth/profile');
        if (response && response.user) {
          const u = response.user;
          setUserName(u.full_name || '');
          if (u.avatar_url) {
            setAvatarUrl(u.avatar_url);
          }
          if (response.activeWorkshopName) {
            setWorkshopName(response.activeWorkshopName);
          }
          if (u.role) {
            const lowRole = u.role.toLowerCase();
            setRole(lowRole);
          }
        }
      } catch (e) {
        console.error('Failed to fetch profile on load', e);
      }
    };
    fetchUserProfile();
  }, [isLoggedIn]);

  // Simulation role upgrade requests
  const [roleRequests, setRoleRequests] = useState([
    { id: 'req-1', userName: "Le Minh Tuan", requestedRole: 'volunteer', status: 'pending', date: '2026-05-31 08:30', workshopName: null },
    { id: 'req-2', userName: "Nguyen Thi Mai", requestedRole: 'workshop', status: 'pending', date: '2026-05-31 09:15', workshopName: null },
  ]);

  // Mechanic linkage requests queue
  const [linkRequests, setLinkRequests] = useState([]);

  // Handle register callback
  const login = (roleType, name, shop = null, avatar = '') => {
    setIsLoggedIn(true);
    setRole(roleType);
    setUserName(name || "New user");
    setWorkshopName(shop);
    setAvatarUrl(avatar);
  };

  const register = ({ name, email, role: registeredRole, workshopName: selectedWorkshop }) => {
    login(registeredRole, name, selectedWorkshop);
  };

  const loginToUser = (userData = {}, isRemembered = false) => {
    setRememberMeState(isRemembered);
    const roleName = (userData.role || 'user').toLowerCase();
    const fullName = userData.full_name || userData.name || "User";
    const avatar = userData.avatar_url || '';
    login(roleName, fullName, null, avatar);
  };

  const logout = async () => {
    try {
      // Best effort to call backend logout to invalidate token
      const hasToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
      if (hasToken) {
        // dynamic import or fetch here since the user removed apiService import
        // using fetch directly to avoid import issues
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/logout`, { 
          method: 'POST', 
          headers: { 
            'Authorization': `Bearer ${hasToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        }).catch(() => {});
      }
    } finally {
      setIsLoggedIn(false);
      setRole('guest');
      setUserName('');
      setWorkshopName(null);
      setAvatarUrl('');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
    }
  };

  // Upgrades
  const upgradeRole = ({ role: upgradedRole, workshopName: selectedWorkshop }) => {
    const existing = roleRequests.find(r => r.userName === userName && r.status === 'pending');
    if (existing) {
      alert("You already have an upgrade request pending!");
      return;
    }
    const newRequest = {
      id: `req-${Date.now()}`,
      userName: userName || "Nguyen Minh Chau",
      requestedRole: upgradedRole,
      status: 'pending',
      date: new Date().toLocaleString(),
      workshopName: selectedWorkshop || null,
    };
    setRoleRequests(prev => [newRequest, ...prev]);
    alert(`An upgrade registration request has been sent ${upgradedRole.toUpperCase()} success! Please wait for approval.`);
  };

  const cancelUpgrade = () => {
    setRoleRequests(prev => prev.filter(req => !(req.userName === userName && req.status === 'pending')));
  };

  const approveRequest = (requestId) => {
    setRoleRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        if (req.userName === userName) {
          setRole(req.requestedRole);
          if (req.workshopName) {
            setWorkshopName(req.workshopName);
          }
        }
        return { ...req, status: 'approved' };
      }
      return req;
    }));
  };

  const rejectRequest = (requestId) => {
    setRoleRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, status: 'rejected' } : req
    ));
  };

  // Workshop linkages
  const linkWorkshop = (shop) => {
    const existing = linkRequests.find(r => r.userName === userName && r.status === 'pending');
    if (existing) {
      alert("You already have a link request waiting for approval!");
      return;
    }
    const newRequest = {
      id: `lnk-${Date.now()}`,
      userName: userName || "Tran Van Binh",
      requestedShop: shop,
      status: 'pending',
      date: new Date().toLocaleString(),
    };
    setLinkRequests(prev => [newRequest, ...prev]);
    alert(`Link request sent to ${shop} success! Please wait for the workshop owner to approve.`);
  };

  const cancelLinkRequest = () => {
    setLinkRequests(prev => prev.filter(req => !(req.userName === userName && req.status === 'pending')));
  };

  const unlinkWorkshop = () => {
    setWorkshopName(null);
    alert("Unlinked to factory successfully.");
  };

  const approveLink = (requestId) => {
    setLinkRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        if (req.userName === userName) {
          setWorkshopName(req.requestedShop);
        }
        return { ...req, status: 'approved' };
      }
      return req;
    }));
  };

  const rejectLink = (requestId) => {
    setLinkRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, status: 'rejected' } : req
    ));
  };
  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        role,
        userName,
        setUserName,
        workshopName,
        avatarUrl,
        setAvatarUrl,
        roleRequests,
        linkRequests,
        login,
        register,
        loginToUser,
        logout,
        upgradeRole,
        cancelUpgrade,
        approveRequest,
        rejectRequest,
        linkWorkshop,
        cancelLinkRequest,
        unlinkWorkshop,
        approveLink,
        rejectLink
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
