import { useEffect, useState } from "react";

export default function useInternetStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      // Browser already knows it's offline
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }

      // Verify actual internet access with a tiny request
      try {
        const controller = new AbortController();

        const timeout = setTimeout(() => controller.abort(), 3000);

        await fetch("https://www.gstatic.com/generate_204", {
          method: "GET",
          cache: "no-store",
          mode: "no-cors",
          signal: controller.signal,
        });

        clearTimeout(timeout);
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    };

    checkConnection();

    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);

    const timer = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  return isOffline;
}