import React from "react";
import { Mail, MessageCircle } from "lucide-react";

import ToggleSwitch from "@/admin/components/settings/ToggleSwitch";

export default function NotificationRow({
  notification,
  loadingField,
  onToggle,
}) {
  return (
    <div className="grid grid-cols-[1fr_100px_100px] items-center border-b border-gray-100 px-4 py-4 last:border-b-0 dark:border-zinc-800">
      <div>
        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {notification.event_name}
        </p>
      </div>

      <div className="flex justify-center">
        <ToggleSwitch
          checked={notification.email_enabled}
          loading={loadingField === "email_enabled"}
          onChange={(value) => onToggle(notification, "email_enabled", value)}
        />
      </div>

      {/* <div className="flex flex-col items-center justify-center gap-1">
        <ToggleSwitch
          checked={notification.whatsapp_enabled}
          loading={loadingField === "whatsapp_enabled"}
          disabled={true}
          onChange={(value) =>
            onToggle(notification, "whatsapp_enabled", value)
          }
        /> */}
        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 text-center leading-tight max-w-[90px]">
          Coming Soon
        </span>
      </div>
    // </div>
  );
}
