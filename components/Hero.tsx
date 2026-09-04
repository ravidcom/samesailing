import SearchForm from "./SearchForm";
import HeroScene from "./HeroScene";

export default function Hero() {
  return (
    <section className="mx-auto max-w-[980px] px-4 pt-[54px] text-center sm:px-8 md:px-12">
      <h1 className="mb-[18px] font-display text-[34px] leading-[1.04] font-bold tracking-[-0.02em] text-charcoal sm:text-[44px] lg:text-[54px]">
        Your sailing is full of
        <br />
        friends you <em className="text-teal not-italic whitespace-nowrap">haven&apos;t met</em>
      </h1>
      <p className="mx-auto mb-[30px] max-w-[480px] text-[15px] leading-[1.6] text-muted sm:text-base lg:text-[17px]">
        Discover travelers on your exact cruise. Plan dinners, find playmates
        for the kids, share a shore excursion - all before you board.
      </p>

      <SearchForm />

      <div className="relative mx-auto mt-[26px] h-[150px] max-w-[780px] overflow-hidden rounded-[24px] sm:mt-[34px] sm:h-[220px]">
        <HeroScene />
      </div>

      <div className="flex flex-wrap justify-center gap-6 pt-[30px] pb-1 sm:gap-10 md:gap-[52px]">
        <div>
          <div className="mb-0.5 font-display text-[27px] font-bold text-teal">
            Founding
          </div>
          <div className="text-xs font-medium text-muted-2">
            Be one of the first aboard
          </div>
        </div>
        <div>
          <div className="mb-0.5 font-display text-[27px] font-bold text-teal">
            Free
          </div>
          <div className="text-xs font-medium text-muted-2">
            Always free to join
          </div>
        </div>
        <div>
          <div className="mb-0.5 font-display text-[27px] font-bold text-charcoal">
            100%
          </div>
          <div className="text-xs font-medium text-muted-2">
            Privacy-first
          </div>
        </div>
      </div>
    </section>
  );
}
