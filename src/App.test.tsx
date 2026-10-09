import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  it("renders the app shell", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /video studio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /projects/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^new video$/i }),
    ).toBeInTheDocument();
  });
});
