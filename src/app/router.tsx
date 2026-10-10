import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { CreateJobPage } from "../pages/CreateJobPage";
import { JobDetailPage } from "../pages/JobDetailPage";
import { GeminiAutopilotPage } from "../pages/GeminiAutopilotPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { StoragePage } from "../pages/StoragePage";
import { CreateSceneVideoPage, SceneVideoPage } from "../pages/SceneVideoPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<ProjectsPage />} />
          <Route path="gemini-autopilot" element={<GeminiAutopilotPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="videos" element={<ProjectsPage />} />
          <Route path="videos/new" element={<CreateSceneVideoPage />} />
          <Route path="create" element={<CreateJobPage />} />
          <Route path="slideshow-jobs/:jobId" element={<JobDetailPage />} />
          <Route path="scene-jobs/create" element={<CreateSceneVideoPage />} />
          <Route path="scene-jobs/:jobId" element={<SceneVideoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

