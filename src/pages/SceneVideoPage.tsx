import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { apiJson } from "../lib/apiClient";
import { shouldPollSceneJob } from "./sceneReviewExecution";
import { SceneProductionStudio } from "./SceneProductionStudio";
import type { SceneJob } from "./sceneVideoTypes";
import "./project-studio.css";
export { CreateSceneVideoPage } from "./NewVideoPage";

export function SceneVideoPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const query = useQuery({
    queryKey: ["sceneVideoJob", jobId],
    queryFn: () => apiJson<SceneJob>(`/scene-video-jobs/${encodeURIComponent(jobId ?? "")}`),
    enabled: Boolean(jobId),
    refetchInterval: (state) => shouldPollSceneJob(state.state.data) ? 2000 : false,
  });
  if (!jobId) return <p>Scene-video job ID is missing.</p>;
  if (query.isLoading) return <p role="status">Loading scene-video job?</p>;
  if (query.isError && !query.data) return <p role="alert">{query.error instanceof Error ? query.error.message : "Could not load scene-video job."}</p>;
  if (!query.data) return <p>No scene-video job returned.</p>;
  return <>{query.isError && <p role="alert">Could not refresh project: {query.error.message}</p>}<SceneProductionStudio key={jobId} job={query.data} onChanged={() => void query.refetch()}/></>;
}
