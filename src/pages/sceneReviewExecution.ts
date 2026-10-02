type PollableJob = { status?: string; scenes?: { attempts?: { review_runs?: { status: string }[] }[] }[] };

export function shouldPollSceneJob(job?: PollableJob): boolean {
  return ["pending", "running"].includes(job?.status ?? "") || Boolean(job?.scenes?.some((scene) => scene.attempts?.some((attempt) => ["queued", "running"].includes(attempt.review_runs?.at(-1)?.status ?? ""))));
}
