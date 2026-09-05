import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import PassengersScreen from "@/components/board/PassengersScreen";
import { getSailingById } from "@/lib/cruiseData";
import { getCachedSailingPassengers } from "@/lib/sailingPassengers";
import { getBoardData } from "@/lib/boardData";

export async function generateMetadata({ params }: PageProps<"/sailing/[id]/board">): Promise<Metadata> {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) return {};
  const metaPassengerRows = await getCachedSailingPassengers(sailing.id);
  const count = metaPassengerRows.length;
  const title = `${sailing.shipName} passengers - ${sailing.date}`;
  const description =
    count && count > 0
      ? `See who's already sailing on ${sailing.shipName}, departing ${sailing.date} from ${sailing.port} - ${count} traveler${count === 1 ? "" : "s"} have joined so far.`
      : `Browse passengers on ${sailing.shipName}, departing ${sailing.date} from ${sailing.port}.`;
  return {
    title,
    description,
    alternates: { canonical: `/sailing/${sailing.id}/board` },
    openGraph: { title, description, url: `/sailing/${sailing.id}/board` },
    twitter: { title, description },
  };
}

export default async function BoardPage({ params }: PageProps<"/sailing/[id]/board">) {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) notFound();

  const boardData = await getBoardData(sailing.id);
  if (!boardData) notFound();

  // Lets Google show a path (Home > Ship - Date > Passengers) instead of
  // the raw URL for this page's search result.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://samesailing.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: `${sailing.shipName} - ${sailing.date}`,
        item: `https://samesailing.com/sailing/${sailing.id}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Passengers",
        item: `https://samesailing.com/sailing/${sailing.id}/board`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <NavBar />
      <PassengersScreen initial={boardData} />
    </>
  );
}
