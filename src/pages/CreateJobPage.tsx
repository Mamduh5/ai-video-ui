import { useNavigate } from "react-router-dom";

import { CreateJobForm } from "../features/slideshowJobs/components/CreateJobForm";

export function CreateJobPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Create Presentation Video</h2>
        <p className="mt-1 text-sm text-slate-600">
          Submit a structured slideshow request to the backend API.
        </p>
      </div>
      <CreateJobForm
        onCreated={(response) => navigate(`/slideshow-jobs/${response.id}`)}
      />
    </div>
  );
}
