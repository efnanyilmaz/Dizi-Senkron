import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Holes() {
  const holes = Array.from({ length: 24 });
  return (
    <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
      {holes.map((_, i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#221430",
          }}
        />
      ))}
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#221430",
          backgroundImage:
            "radial-gradient(ellipse 900px 560px at 88% -10%, rgba(168,123,250,0.22), transparent 60%), radial-gradient(ellipse 780px 560px at -8% 108%, rgba(122,61,168,0.24), transparent 60%)",
        }}
      >
        <div style={{ display: "flex", background: "#4a2f52", padding: "10px 0" }}>
          <Holes />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "0 90px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,210,63,0.16)",
              color: "#ffd23f",
              fontSize: 24,
              letterSpacing: 4,
              marginBottom: 32,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ffd23f" }} />
            ŞU AN SENKRON
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 800,
              color: "#f5e6c8",
              letterSpacing: 4,
              lineHeight: 1,
            }}
          >
            DİZİ SENKRON
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#c7cbd1",
              marginTop: 28,
              maxWidth: 820,
            }}
          >
            Arkadaşlarınla dizi takip et, spoiler almadan sohbet et.
          </div>
        </div>

        <div style={{ display: "flex", background: "#4a2f52", padding: "10px 0" }}>
          <Holes />
        </div>
      </div>
    ),
    { ...size },
  );
}
