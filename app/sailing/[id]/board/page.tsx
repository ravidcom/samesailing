import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import BoardActions from "@/components/board/BoardActions";
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
    .select("id,name,name_mode,nickname,last_initial")
    .in(
      "id",
      joined.map((r) => r.user_id)
    );
  const namesById = new Map((nameRows ?? []).map((r) => [r.id, r]));

  const passengers = joined.map((r) => {
    const n = namesById.get(r.user_id);
    const nameFields = n
      ? { nameMode: n.name_mode, nickname: n.nickname, name: n.name, lastInitial: n.last_initial }
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
        <div className="mx-auto my-5 max-w-[1000px] overflow-hidden rounded-[22px] px-4 shadow-[0_8px_24px_rgba(0,0,0,.06)] sm:px-8 md:px-0">
          <div className="rounded-t-[22px] bg-linear-to-br from-[#12a0ad] to-[#0a6e79] px-6 py-7 text-white sm:px-9">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="mb-3 text-xs font-bold tracking-[.1em] text-white/90 uppercase">
                  {lineLabel}
                </div>
                <div className="font-display text-[32px] font-extrabold leading-none tracking-[-0.025em] sm:text-[40px]">
                  {sailing.shipName}
                </div>
                <div className="mt-2 text-[15px] font-semibold text-[#bff0f2] sm:text-[17px]">
                  {dest}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3.5">
                {countdown ? (
                  <div className="whitespace-nowrap rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-bold">
                    ⏳ {countdown}
                  </div>
                ) : null}
                <div className="flex gap-6">
                  <div>
                    <div className="text-[11px] font-bold tracking-[.08em] text-[#a9e4e9] uppercase">
                      Departs
                    </div>
                    <div className="mt-1 text-sm font-bold">{sailing.date}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold tracking-[.08em] text-[#a9e4e9] uppercase">
                      From
                    </div>
                    <div className="mt-1 text-sm font-bold">{sailing.port}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-b-[22px] bg-white px-6 pb-6 pt-6 sm:px-9">
            <div className="hidden items-start gap-5 overflow-x-auto sm:flex">
              <div className="shrink-0">
                <div className="font-display text-[13px] font-bold leading-relaxed text-teal">
                  Your route
                </div>
                <div className="text-xs font-semibold text-[#8aa6aa]">
                  {ports.length - 2} port{ports.length - 2 === 1 ? "" : "s"} of call
                </div>
              </div>
              <div className="flex flex-1 items-start">
                {ports.map((port, i) => (
                  <div key={i} className="flex min-w-16 flex-1 items-start">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ background: i === 0 || i === ports.length - 1 ? "#0E8C99" : "#ed5f43" }}
                      />
                      <div className="whitespace-nowrap text-xs font-bold text-charcoal">{port}</div>
                    </div>
                    {i < ports.length - 1 ? (
                      <div className="mx-1 mb-5 mt-1.5 min-w-[18px] flex-1 border-t-2 border-dashed border-[#cfe6e8]" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-[13px] font-semibold text-[#3a5a5f] sm:hidden">
              <span className="shrink-0 text-lg">🧭</span>
              <span>{ports.join(" → ")}</span>
            </div>

            <BoardActions sailingId={sailing.id} />
          </div>
        </div>

        <PassengerBoard sailingId={sailing.id} passengers={passengers} />
      </main>
    </>
  );
}
