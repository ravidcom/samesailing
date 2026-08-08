"use client";

import Toggle from "@/components/ui/Toggle";
import { useAuth } from "@/lib/auth-context";

export default function NotificationSettings() {
  const { notifications, updateNotificationSettings } = useAuth();

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold text-charcoal">
        Notification settings
      </h2>
      <div className="overflow-hidden rounded-[20px] border border-[#e4f0f1] bg-white">
        <div className="flex items-center justify-between gap-5 border-b border-border px-5.5 py-4.5">
          <div>
            <div className="mb-1 text-sm font-semibold text-charcoal">
              Group chat activity
            </div>
            <div className="text-xs leading-relaxed text-muted">
              Log a notification here when someone posts in one of your
              sailings&apos; group chats.
            </div>
          </div>
          <Toggle
            on={notifications.notifyDigest}
            onChange={() => updateNotificationSettings({ notifyDigest: !notifications.notifyDigest })}
          />
        </div>
        <div className="flex items-center justify-between gap-5 border-b border-border px-5.5 py-4.5">
          <div>
            <div className="mb-1 text-sm font-semibold text-charcoal">
              Private message alerts
            </div>
            <div className="text-xs leading-relaxed text-muted">
              Log a notification here when someone sends you a private
              message.
            </div>
          </div>
          <Toggle
            on={notifications.notifyDmAlerts}
            onChange={() => updateNotificationSettings({ notifyDmAlerts: !notifications.notifyDmAlerts })}
          />
        </div>
        <div className="flex items-center justify-between gap-5 px-5.5 py-4.5">
          <div>
            <div className="mb-1 text-sm font-semibold text-charcoal">
              Account &amp; security
            </div>
            <div className="text-xs leading-relaxed text-muted">
              Password resets and login alerts happen outside this app, via
              Supabase Auth.
            </div>
          </div>
          <span className="whitespace-nowrap text-xs text-muted-2">Always on</span>
        </div>
      </div>
    </div>
  );
}
