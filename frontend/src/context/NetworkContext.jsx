import { createContext, useContext, useState } from "react";

const NetworkContext = createContext();

export function NetworkProvider({ children }) {
  const [isOffline, setIsOffline] = useState(false);

  return (
    <NetworkContext.Provider
      value={{
        isOffline,
        setIsOffline,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}