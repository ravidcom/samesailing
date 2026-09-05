export const fieldLabel =
  "mb-1.5 block text-[11px] font-semibold tracking-[.06em] text-muted-2 uppercase";

// text-base (16px) on phones - iOS Safari auto-zooms the whole page in on
// focus for any form control whose computed font-size is under 16px, and
// the zoom doesn't reliably reset on blur, leaving the page zoomed with
// horizontal scroll needed to see clipped content. sm: reverts to the
// intended 14px look everywhere wider than a phone.
export const textInput =
  "w-full rounded-[11px] border-[1.5px] border-border bg-input px-[13px] py-3 font-sans text-base sm:text-sm text-charcoal transition-colors focus:border-teal";

export const selectInput = textInput + " select-chevron cursor-pointer pr-[34px]";

export const primaryButton =
  "mt-[22px] w-full rounded-[11px] border-none bg-teal py-3.5 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark";

export const backLink =
  "mt-3 w-full bg-none font-sans text-[13px] text-muted-2 hover:text-muted";

export const errorText = "mt-2 text-[12px] text-[#d9482e]";

export const socialButton =
  "mb-2.5 flex w-full items-center justify-center gap-2.5 rounded-[11px] border-[1.5px] border-border bg-input px-4 py-[11px] font-sans text-sm text-muted transition-colors hover:border-muted-2";
