import { ImageResponse } from "next/og";
import { logoMarkDataUri } from "@/lib/logoMarkSvg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignores alpha and fills transparent pixels with black, so this needs
// an opaque background rather than the transparent one the other icons use.
export default async function AppleIcon() {
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
        <img src={logoMarkDataUri()} width={140} height={140} alt="" />
      </div>
    ),
    { ...size }
  );
}
