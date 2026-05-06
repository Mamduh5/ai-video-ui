import { render, screen } from "@testing-library/react";

import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders a label with status styling", () => {
    render(<StatusBadge label="Running" tone="running" />);

    expect(screen.getByText("Running")).toBeInTheDocument();
  });
});

