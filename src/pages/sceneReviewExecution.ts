type PollableJob = { next_action?: {background?: boolean}; status?: string; production?: { started: boolean; paused: boolean; status: string }; scenes?: { flow_runs?: { status: string }[]; attempts?: { review_runs?: { status: string }[] }[] }[] };

export function shouldPollSceneJob(job?: PollableJob): boolean {
  return Boolean(job?.next_action?.background) || Boolean(job?.production?.started && !job.production.paused && ["ready", "generating", "reviewing", "assembling"].includes(job.production.status)) || ["pending", "running"].includes(job?.status ?? "") || Boolean(job?.scenes?.some((scene) => ["queued", "opening_provider", "submission_intent", "submitted", "generating", "downloading", "importing"].includes(scene.flow_runs?.at(-1)?.status ?? "") || scene.attempts?.some((attempt) => ["queued", "running"].includes(attempt.review_runs?.at(-1)?.status ?? ""))));
}
