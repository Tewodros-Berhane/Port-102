import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("applies semantic tones without status-specific colors", () => {
    const html = renderToStaticMarkup(
      <StatusBadge label="Awaiting review" tone="warning" />,
    );
    expect(html).toContain("bg-warning-subtle");
    expect(html).toContain("Awaiting review");
  });
});
