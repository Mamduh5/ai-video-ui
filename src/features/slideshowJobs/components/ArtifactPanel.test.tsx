import { render, screen } from "@testing-library/react";

import { ApiClientError } from "../../../lib/apiClient";
import { useJsonArtifact, useTextArtifact } from "../hooks";

import { JsonArtifactViewer } from "./JsonArtifactViewer";
import { TextArtifactViewer } from "./TextArtifactViewer";

vi.mock("../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks")>();

  return {
    ...actual,
    useJsonArtifact: vi.fn(),
    useTextArtifact: vi.fn(),
  };
});

describe("artifact viewers", () => {
  beforeEach(() => {
    vi.mocked(useJsonArtifact).mockReset();
    vi.mocked(useTextArtifact).mockReset();
  });

  it("renders text artifacts", () => {
    vi.mocked(useTextArtifact).mockReturnValue(
      queryState({ data: "Narration script" }),
    );

    render(<TextArtifactViewer title="Script" url="http://api.test/script" />);

    expect(screen.getByText("Script")).toBeInTheDocument();
    expect(screen.getByText("Narration script")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    vi.mocked(useTextArtifact).mockReturnValue(queryState({ isLoading: true }));

    render(<TextArtifactViewer title="Script" url="http://api.test/script" />);

    expect(screen.getByText("Loading artifact...")).toBeInTheDocument();
  });

  it("renders 409 not-ready state", () => {
    vi.mocked(useTextArtifact).mockReturnValue(
      queryState({
        error: new ApiClientError({
          category: "artifact_not_ready",
          status: 409,
          message: "Not ready",
        }),
      }),
    );

    render(<TextArtifactViewer title="Script" url="http://api.test/script" />);

    expect(
      screen.getByText("This artifact is still being generated."),
    ).toBeInTheDocument();
  });

  it("renders generic artifact errors", () => {
    vi.mocked(useTextArtifact).mockReturnValue(
      queryState({
        error: new ApiClientError({
          category: "network",
          message: "Network down",
        }),
      }),
    );

    render(<TextArtifactViewer title="Script" url="http://api.test/script" />);

    expect(
      screen.getByText("Backend is unavailable. Check that the API is running."),
    ).toBeInTheDocument();
  });

  it("renders formatted JSON artifacts", () => {
    vi.mocked(useJsonArtifact).mockReturnValue(
      queryState({ data: { slides: [{ title: "Intro" }] } }),
    );

    render(<JsonArtifactViewer title="Plan" url="http://api.test/plan" />);

    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText(/"title": "Intro"/)).toBeInTheDocument();
  });

  it("stays disabled without an artifact URL", () => {
    vi.mocked(useTextArtifact).mockReturnValue(queryState({}));

    render(<TextArtifactViewer title="Script" url={null} />);

    expect(
      screen.getByText("This artifact is not available yet."),
    ).toBeInTheDocument();
  });
});

function queryState(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useTextArtifact>;
}
