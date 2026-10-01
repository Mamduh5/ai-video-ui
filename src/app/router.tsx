import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { CreateJobPage } from "../pages/CreateJobPage";
import { JobDetailPage } from "../pages/JobDetailPage";
import { RecentJobsPage } from "../pages/RecentJobsPage";
import { CreateSceneVideoPage, SceneVideoPage } from "../pages/SceneVideoPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<RecentJobsPage />} />
          <Route path="create" element={<CreateJobPage />} />
          <Route path="slideshow-jobs/:jobId" element={<JobDetailPage />} />
          <Route path="scene-jobs/create" element={<CreateSceneVideoPage />} />
          <Route path="scene-jobs/:jobId" element={<SceneVideoPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

