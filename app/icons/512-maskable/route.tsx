import { ImageResponse } from "next/og";
import { logoMarkDataUri } from "@/lib/logoMarkSvg";

export const contentType = "image/png";
export const dynamic = "force-static";

// Android's adaptive-icon mask crops to a circle roughly 80% of the canvas
// diameter, so the mark stays well inside that safe zone here (~62% fill)
// with an opaque background — maskable icons can't rely on transparency.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e4f3f4",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoMarkDataUri()} width={320} height={320} alt="" />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
