import React, { createContext, useContext, useState, useCallback } from 'react';

interface ClientInfo {
  nit: string;
  name: string;
  regime: string;
}

interface TenantContextType {
  currentClient: ClientInfo | null;
  setCurrentClient: (client: ClientInfo | null) => void;
  clientList: ClientInfo[];
  setClientList: (clients: ClientInfo[]) => void;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentClient, setCurrentClient] = useState<ClientInfo | null>(null);
  const [clientList, setClientList] = useState<ClientInfo[]>([]);

  return (
    <TenantContext.Provider value={{ currentClient, setCurrentClient, clientList, setClientList }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
