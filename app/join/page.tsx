import NavBar from "@/components/NavBar";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function JoinGenericPage() {
  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <OnboardingWizard sailing={null} />
      </main>
    </>
  );
}
