import { Card } from "../../../components/ui/Card";
import { cn } from "../../../lib/format";
import {
  getSlideshowStepLabel,
  isKnownSlideshowStep,
  SLIDESHOW_STEP_ORDER,
} from "../status";
import type { SlideshowJobDetail, SlideshowJobStep } from "../types";

interface ProgressTimelineProps {
  job: SlideshowJobDetail;
}

export function ProgressTimeline({ job }: ProgressTimelineProps) {
  const activeStep = normalizeStep(job.current_step ?? job.progress?.step);
  const activeIndex = activeStep
    ? SLIDESHOW_STEP_ORDER.indexOf(activeStep)
    : -1;
  const completedSteps = new Set(job.progress?.completed_steps ?? []);
  const percent = job.progress?.percent;
  const currentIndex = job.progress?.current_index;
  const totalSteps = job.progress?.total_steps;

  return (
    <Card>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold">Progress</h3>
          <p className="mt-1 text-sm text-slate-600">
            Current step: {getSlideshowStepLabel(activeStep ?? job.status)}
          </p>
        </div>

        {typeof percent === "number" ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Progress</span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-slate-900"
                style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
              />
            </div>
          </div>
        ) : null}

        {typeof currentIndex === "number" && typeof totalSteps === "number" ? (
          <p className="text-sm text-slate-600">
            Step {currentIndex} of {totalSteps}
          </p>
        ) : null}

        <ol className="space-y-3">
          {SLIDESHOW_STEP_ORDER.map((step, index) => {
            const isCompleted =
              job.status === "completed" ||
              completedSteps.has(step) ||
              (activeIndex > -1 && index < activeIndex);
            const isActive =
              job.status !== "completed" &&
              job.status !== "failed" &&
              activeStep === step;
            const isFailed =
              job.status === "failed" &&
              (activeStep === step || (step === "rendering" && !activeStep));

            return (
              <li className="flex gap-3" key={step}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isFailed
                      ? "border-red-300 bg-red-50 text-red-700"
                      : isCompleted
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : isActive
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-slate-50 text-slate-400",
                  )}
                >
                  {isFailed ? "!" : isCompleted ? "✓" : index + 1}
                </span>
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isFailed
                        ? "text-red-800"
                        : isActive
                          ? "text-blue-800"
                          : "text-slate-800",
                    )}
                  >
                    {getSlideshowStepLabel(step)}
                  </p>
                  {isActive ? (
                    <p className="text-sm text-blue-700">In progress</p>
                  ) : null}
                  {isCompleted ? (
                    <p className="text-sm text-emerald-700">Complete</p>
                  ) : null}
                  {isFailed ? (
                    <p className="text-sm text-red-700">Failed here</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

function normalizeStep(step?: string | null): SlideshowJobStep | undefined {
  return step && isKnownSlideshowStep(step) ? step : undefined;
}

