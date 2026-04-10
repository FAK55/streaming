'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const ServerHostContext = createContext<{
  host: string;
  setHost: (h: string) => void;
}>({ host: 'localhost', setHost: () => {} });

export function ServerHostProvider({ children }: { children: ReactNode }) {
  const [host, setHostState] = useState('localhost');

  useEffect(() => {
    const saved = localStorage.getItem('streamlab-host');
    setHostState(saved || window.location.hostname || 'localhost');
  }, []);

  const setHost = (h: string) => {
    localStorage.setItem('streamlab-host', h);
    setHostState(h);
  };

  return (
    <ServerHostContext.Provider value={{ host, setHost }}>
      {children}
    </ServerHostContext.Provider>
  );
}

export function useServerHost() {
  return useContext(ServerHostContext);
}
