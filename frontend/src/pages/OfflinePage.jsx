import { useEffect } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import useStoreSettings from "@/shared/hooks/useStoreSettings";

export default function OfflinePage() {
  const { settings } = useStoreSettings();

  const storeName =
    import.meta.env.VITE_STORE_NAME || "My Designers";

  useEffect(() => {
    const online = () => window.location.reload();

    window.addEventListener("online", online);

    return () => window.removeEventListener("online", online);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0c1018]">

      {/* Background */}

      <div className="absolute inset-0">

        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[180px]" />

        <div className="absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-[180px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(0,0,0,.45))]" />

      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 text-center">

        {/* Logo */}

        {settings?.logo ? (
          <img
            src={settings.logo}
            alt={storeName}
            className="h-12 w-auto object-contain"
          />
        ) : (
          <div className="text-4xl">
            🦅
          </div>
        )}

        <p className="mt-4 tracking-[0.45em] text-[11px] uppercase text-[#d8b26c]">
          {storeName}
        </p>

        {/* Cloud */}

        <div className="relative mt-12">

          <div className="absolute inset-0 scale-125 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_80px_rgba(37,99,235,.25)]">

            <CloudOff
              size={60}
              strokeWidth={1.8}
              className="text-white animate-pulse"
            />

          </div>

        </div>

        {/* Title */}

        <h1 className="mt-10 text-4xl font-bold text-white md:text-6xl">
          You're Offline
        </h1>

        {/* Subtitle */}

        <p className="mt-5 max-w-md text-sm leading-7 text-gray-400 md:text-base">
          We couldn't connect to the internet.
          <br />
          Please check your Wi-Fi or mobile network.
        </p>

        <div className="my-8 h-px w-36 bg-white/10" />

        {/* Retry */}

        <button
          onClick={() => window.location.reload()}
          className="
            group
            flex
            items-center
            gap-3
            rounded-xl
            bg-gradient-to-r
            from-blue-600
            to-blue-500
            px-8
            py-3.5
            font-semibold
            text-white
            shadow-[0_0_45px_rgba(37,99,235,.45)]
            transition-all
            duration-300
            hover:scale-105
          "
        >
          <RefreshCw
            size={18}
            className="transition-transform duration-500 group-hover:rotate-180"
          />

          Retry
        </button>

        <p className="mt-7 animate-pulse text-xs text-gray-500">
          ● Waiting for connection...
        </p>

      </div>
    </div>
  );
}