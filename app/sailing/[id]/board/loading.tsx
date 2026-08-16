import NavBar from "@/components/NavBar";

export default function BoardLoading() {
  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-center justify-center pt-[62px]">
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-border border-t-teal"
          role="status"
          aria-label="Loading"
        />
      </main>
    </>
  );
}
