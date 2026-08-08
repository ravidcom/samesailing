import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <NavBar />
      <main className="pt-[62px]">
        <Hero />
        <HowItWorks />
        <Footer />
      </main>
    </>
  );
}
