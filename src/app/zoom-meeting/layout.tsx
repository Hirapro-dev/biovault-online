import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zoom Live",
};

/**
 * Zoom Client View専用レイアウト
 * iframe内で使用されるため、余計なUIを一切表示しない
 */
export default function ZoomMeetingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "black",
      }}
    >
      {children}
    </div>
  );
}
