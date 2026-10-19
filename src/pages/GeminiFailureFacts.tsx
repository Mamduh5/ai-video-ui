export type GeminiFailureStatus = {
  job_id: string;
  run_id?: string;
  scene_order?: number;
  code: string;
  stage: string;
  message: string;
  provider_response?: string;
  request_received: "yes" | "no" | "unknown";
  application_slot_consumed: boolean;
  previous_result_recoverable: "yes" | "no" | "unknown";
  force_retry_permitted: boolean;
  force_retry_blocker?: string;
  next_action: string;
};

const stages: Record<string, string> = {
  video_mode: "Opening video mode", opening_video_mode: "Opening video mode",
  prompt_preparation: "Prompt or reference preparation", preparation: "Prompt or reference preparation",
  pre_submission: "Before submission", before_submission: "Before submission", submission: "Submitting to Gemini",
  after_submission: "After Gemini submission", provider_response: "After Gemini submission",
  generation: "Gemini video generation", provider_generation: "Gemini video generation",
  result_detection: "Result detection", download: "Video download", import: "Media import", validation: "Media validation",
};
const known = { yes: "Yes", no: "No", unknown: "Unknown — check the previous request first" };

export function GeminiFailureFacts({ failure }: { failure: GeminiFailureStatus }) {
  return <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm" aria-label="Gemini generation failure">
    <p className="font-medium text-amber-900">{failure.message}</p>
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      <div><dt className="font-medium">Failed stage</dt><dd>{stages[failure.stage] ?? failure.stage.replaceAll("_", " ")}</dd></div>
      <div><dt className="font-medium">Provider response</dt><dd className="whitespace-pre-wrap break-words">{failure.provider_response || "No provider response was captured."}</dd></div>
      <div><dt className="font-medium">Gemini received the request</dt><dd>{failure.request_received === "no" ? "No — no generation was submitted" : known[failure.request_received]}</dd></div>
      <div><dt className="font-medium">Application submission slot consumed</dt><dd>{failure.application_slot_consumed ? "Yes — preserved in submission history" : "No"}</dd></div>
      <div><dt className="font-medium">Previous result recoverable</dt><dd>{known[failure.previous_result_recoverable]}</dd></div>
      <div><dt className="font-medium">Force Retry permitted</dt><dd>{failure.force_retry_permitted ? "Yes — requires confirmation and fresh checks" : `No${failure.force_retry_blocker ? ` — ${failure.force_retry_blocker}` : ""}`}</dd></div>
    </dl>
    <p><span className="font-medium">Next action:</span> {failure.next_action}</p>
  </div>;
}
