import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiClientError } from "../../../lib/apiClient";

import { CreateJobForm } from "./CreateJobForm";

describe("CreateJobForm", () => {
  it("renders required fields and default values", () => {
    render(<CreateJobForm />);

    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByLabelText("Audience")).toHaveValue("general viewers");
    expect(screen.getByLabelText("Language")).toHaveValue("en");
    expect(screen.getByLabelText("Tone")).toHaveValue("clear and friendly");
    expect(screen.getByLabelText("Educational Level")).toHaveValue("general");
    expect(screen.getByLabelText("Visual Style")).toHaveValue(
      "clean educational illustration",
    );
    expect(screen.getByLabelText("Target Duration")).toHaveValue("90");
    expect(screen.getByLabelText("Slides")).toHaveValue("8");
    expect(screen.getByLabelText("Target Platform")).toHaveValue("shorts");
    expect(screen.getByRole("button", { name: "9:16" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Include subtitles")).toBeChecked();
  });

  it("does not render provider selection or content mode controls", () => {
    render(<CreateJobForm />);

    expect(screen.queryByLabelText(/provider/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/content mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/voice provider/i)).not.toBeInTheDocument();
  });

  it("shows validation errors before submit", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn();
    render(<CreateJobForm createJob={createJob} />);

    await user.click(screen.getByRole("button", { name: /create slideshow job/i }));

    expect(await screen.findByText("Topic is required.")).toBeInTheDocument();
    expect(createJob).not.toHaveBeenCalled();
  });

  it("submits the backend request shape and calls onCreated", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockResolvedValue({
      id: "job-123",
      status: "queued",
    });
    const onCreated = vi.fn();
    render(<CreateJobForm createJob={createJob} onCreated={onCreated} />);

    await user.type(
      screen.getByLabelText("Topic"),
      "How photosynthesis works",
    );
    await user.clear(screen.getByLabelText("Must Include"));
    await user.type(screen.getByLabelText("Must Include"), "sunlight, leaves");
    await user.clear(screen.getByLabelText("Must Avoid"));
    await user.type(screen.getByLabelText("Must Avoid"), "watermarks");
    await user.click(screen.getByRole("button", { name: /create slideshow job/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledWith({
        topic: "How photosynthesis works",
        audience: "general viewers",
        language: "en",
        tone: "clear and friendly",
        educational_level: "general",
        visual_style: "clean educational illustration",
        target_duration_seconds: 90,
        slide_count: 8,
        aspect_ratio: "9:16",
        target_platform: "shorts",
        subtitles: true,
        must_include: ["sunlight", "leaves"],
        must_avoid: ["watermarks"],
      });
    });
    expect(onCreated).toHaveBeenCalledWith({ id: "job-123", status: "queued" });
  });

  it("disables submit while pending", async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: { id: string; status: "queued" }) => void;
    const createJob = vi.fn(
      () =>
        new Promise<{ id: string; status: "queued" }>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    render(<CreateJobForm createJob={createJob} />);

    await user.type(
      screen.getByLabelText("Topic"),
      "How photosynthesis works",
    );
    await user.click(screen.getByRole("button", { name: /create slideshow job/i }));

    expect(
      screen.getByRole("button", { name: /creating job/i }),
    ).toBeDisabled();

    resolveCreate!({ id: "job-123", status: "queued" });
  });

  it("shows network errors and does not call onCreated", async () => {
    const user = userEvent.setup();
    const createJob = vi.fn().mockRejectedValue(
      new ApiClientError({
        category: "network",
        message: "Backend unavailable or request blocked.",
      }),
    );
    const onCreated = vi.fn();
    render(<CreateJobForm createJob={createJob} onCreated={onCreated} />);

    await user.type(
      screen.getByLabelText("Topic"),
      "How photosynthesis works",
    );
    await user.click(screen.getByRole("button", { name: /create slideshow job/i }));

    expect(
      await screen.findByText(
        "Backend is unavailable. Check that the API is running.",
      ),
    ).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});

