import { useEffect, useState } from "react";

export default function useInternetStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let timer;

    const checkInternet = async () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }

      try {
        // Lightweight connectivity check
        await fetch("https://www.gstatic.com/generate_204", {
          method: "GET",
          cache: "no-store",
        });

        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    };

    checkInternet();

    window.addEventListener("online", checkInternet);
    window.addEventListener("offline", checkInternet);

    timer = setInterval(checkInternet, 5000);

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", checkInternet);
      window.removeEventListener("offline", checkInternet);
    };
  }, []);

  return isOffline;
}