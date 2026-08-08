import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { getSailingById } from "@/lib/cruiseData";

export default async function JoinPage({ params }: PageProps<"/join/[id]">) {
  const { id } = await params;
  const sailing = getSailingById(id);
  if (!sailing) notFound();

  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <OnboardingWizard sailing={sailing} />
      </main>
    </>
  );
}
