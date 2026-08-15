import { ImageResponse } from "next/og";
import { logoMarkDataUri } from "@/lib/logoMarkSvg";

export const contentType = "image/png";
export const dynamic = "force-static";

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
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoMarkDataUri()} width={168} height={168} alt="" />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
