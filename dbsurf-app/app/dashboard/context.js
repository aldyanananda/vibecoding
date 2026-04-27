'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) setUser(await res.json());
    } catch { 
    } finally {
      setLoadingUser(false);
    }
  };

  const refreshProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch { 
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    refreshUser();
    refreshProjects();
  }, []);

  return (
    <DashboardContext.Provider value={{ 
      user, 
      projects, 
      loadingUser, 
      loadingProjects, 
      refreshUser, 
      refreshProjects 
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
