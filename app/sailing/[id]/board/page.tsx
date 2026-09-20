import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import PassengersScreen from "@/components/board/PassengersScreen";
import BoardGate from "@/components/board/BoardGate";
import { getSailingById } from "@/lib/cruiseData";
import { getSailingMemberCount, canViewSailingMembers } from "@/lib/sailingPassengers";
import { getBoardData } from "@/lib/boardData";
import { getVerifiedRequestUser } from "@/lib/supabase/serverAuth";
import { shortDateWithYear } from "@/lib/sailingLabel";

// Who is aboard depends on who is asking, so this page must never be
// prerendered or shared between viewers by Next's cache or a CDN.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/sailing/[id]/board">): Promise<Metadata> {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) return {};
  return {
    title: `${sailing.shipName} passengers - ${sailing.date}`,
    description: `Passenger board for ${sailing.shipName}, departing ${sailing.date}. Visible to members of this sailing.`,
    robots: { index: false, follow: false },
  };
}

export default async function BoardPage({ params }: PageProps<"/sailing/[id]/board">) {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) notFound();

  // Authorise BEFORE any member data is fetched: only a joined member (or an
  // admin) gets the passenger list; everyone else gets the gate below,
  // which is built from public sailing details and a traveler count only.
  const viewer = await getVerifiedRequestUser();
  const allowed = viewer ? await canViewSailingMembers(viewer.supabase, viewer.userId, sailing.id) : false;

  if (!viewer || !allowed) {
    const travelerCount = await getSailingMemberCount(sailing.id);
    return (
      <>
        <NavBar />
        <BoardGate
          sailingId={sailing.id}
          lineLabel={`${sailing.line} · ${sailing.nights} Nights`.toUpperCase()}
          shipName={sailing.shipName}
          dateLabel={shortDateWithYear(sailing.date)}
          port={sailing.port}
          travelerCount={travelerCount}
        />
      </>
    );
  }

  const boardData = await getBoardData(sailing.id, viewer.supabase);
  if (!boardData) notFound();

  return (
    <>
      <NavBar />
      <PassengersScreen initial={boardData} />
    </>
  );
}
