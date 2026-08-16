import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import BoardActions from "@/components/board/BoardActions";
import SailingSwitcher from "@/components/board/SailingSwitcher";
import PassengerBoard from "@/components/board/PassengerBoard";
import { getSailingById, portsFor } from "@/lib/cruiseData";
import { daysUntilDate, countdownLabelForDays } from "@/lib/dateMath";
import { passengerFromProfile } from "@/lib/passengers";
import { createServerClient } from "@/lib/supabase/server";
import type { OnboardingProfile } from "@/lib/auth-context";

export default async function BoardPage({ params }: PageProps<"/sailing/[id]/board">) {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) notFound();

  const supabase = createServerClient();
  const { data: rows } = await supabase
    .from("joined_sailings")
    .select("user_id,profile")
    .eq("sailing_id", sailing.id);
  const joined = (rows ?? []).filter(
    (r): r is { user_id: string; profile: OnboardingProfile } => !!r.profile
  );

  // Display names are account-level (lib/displayName.ts), not stored in the
  // per-sailing profile, so they need a separate join against `profiles`.
  const { data: nameRows } = await supabase
    .from("profiles")
    .select("id,name,name_mode,nickname")
    .in(
      "id",
      joined.map((r) => r.user_id)
    );
  const namesById = new Map((nameRows ?? []).map((r) => [r.id, r]));

  const passengers = joined.map((r) => {
    const n = namesById.get(r.user_id);
    const nameFields = n
      ? { nameMode: n.name_mode, nickname: n.nickname, name: n.name }
      : null;
    return passengerFromProfile(r.user_id, r.profile, nameFields);
  });

  const ports = portsFor(sailing);
  const countdown = countdownLabelForDays(daysUntilDate(sailing.isoDate));
  const nights = sailing.itinerary.match(/\d+/)?.[0] ?? "";
  const lineLabel = `${sailing.line} · ${nights} Nights`.toUpperCase();
  const dest = sailing.itinerary.split("·")[0].trim();

  return (
    <>
      <NavBar />
      <main className="pt-[62px]">
        <div className="mx-auto max-w-[1000px] px-4 pt-4 pb-4 sm:px-8 md:px-0">
          <SailingSwitcher currentId={sailing.id} />

          <div className="overflow-hidden rounded-[18px] bg-linear-to-br from-[#12a0ad] to-[#0a6e79] px-5 py-4 text-white shadow-[0_8px_24px_rgba(0,0,0,.06)] sm:px-7 sm:py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1 text-[11px] font-bold tracking-[.1em] text-white/85 uppercase">
                  {lineLabel}
                </div>
                <div className="font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[28px]">
                  {sailing.shipName}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#bff0f2]">
                  {dest} · {sailing.date} · from {sailing.port}
                </div>
                <div className="mt-2 flex items-start gap-1.5 text-xs font-medium text-white/85">
                  <span className="shrink-0">🧭</span>
                  <span>{ports.join(" → ")}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {countdown ? (
                  <div className="whitespace-nowrap rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-bold">
                    ⏳ {countdown}
                  </div>
                ) : null}
                <BoardActions sailingId={sailing.id} />
              </div>
            </div>
          </div>
        </div>

        <PassengerBoard sailingId={sailing.id} passengers={passengers} />
      </main>
    </>
  );
}
