import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  it("renders the app shell", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /explainer slideshow studio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /recent jobs/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create/i })).toBeInTheDocument();
  });
});

