import { useEffect, useState } from "react";

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
        console.log("ONLINE EVENT");
        setIsOnline(true);
    };

    const handleOffline = () => {
        console.log("OFFLINE EVENT");
        setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}