import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { CreateJobPage } from "../pages/CreateJobPage";
import { JobDetailPage } from "../pages/JobDetailPage";
import { RecentJobsPage } from "../pages/RecentJobsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<RecentJobsPage />} />
          <Route path="create" element={<CreateJobPage />} />
          <Route path="slideshow-jobs/:jobId" element={<JobDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

