import { useState, type FormEvent } from "react";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Field } from "../../../components/ui/Field";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { TagInput } from "../../../components/ui/TagInput";
import { Textarea } from "../../../components/ui/Textarea";
import { Toggle } from "../../../components/ui/Toggle";
import { isApiClientError } from "../../../lib/apiClient";
import { cn } from "../../../lib/format";
import { createSlideshowJob } from "../api";
import { CREATE_JOB_FORM_DEFAULTS } from "../formDefaults";
import type { SlideshowJobCreateResponse } from "../types";
import {
  validateCreateJobForm,
  type CreateJobFormErrors,
  type CreateJobFormValues,
} from "../validation";

interface CreateJobFormProps {
  createJob?: typeof createSlideshowJob;
  onCreated?: (response: SlideshowJobCreateResponse) => void;
}

interface SubmitError {
  message: string;
  technical?: string;
}

const durationOptions = [60, 90, 120];
const slideCountOptions = Array.from({ length: 9 }, (_, index) => index + 4);

export function CreateJobForm({
  createJob = createSlideshowJob,
  onCreated,
}: CreateJobFormProps) {
  const [values, setValues] = useState<CreateJobFormValues>(
    CREATE_JOB_FORM_DEFAULTS,
  );
  const [errors, setErrors] = useState<CreateJobFormErrors>({});
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const result = validateCreateJobForm(values);
    setErrors(result.errors);

    if (!result.request) {
      setSubmitError({ message: "Check the form fields and try again." });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createJob(result.request);
      onCreated?.(response);
    } catch (error) {
      setSubmitError(mapCreateJobError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateValue<Key extends keyof CreateJobFormValues>(
    key: Key,
    value: CreateJobFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold">Content</h3>
            <p className="mt-1 text-sm text-slate-600">
              Describe the slideshow as structured production inputs.
            </p>
          </div>
          <Field
            error={errors.topic}
            hint="Use a specific educational or explainer topic."
            htmlFor="topic"
            label="Topic"
          >
            <Textarea
              aria-invalid={Boolean(errors.topic)}
              id="topic"
              name="topic"
              onChange={(event) => updateValue("topic", event.target.value)}
              placeholder="How photosynthesis works"
              rows={4}
              value={values.topic}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.audience} htmlFor="audience" label="Audience">
              <Input
                aria-invalid={Boolean(errors.audience)}
                id="audience"
                name="audience"
                onChange={(event) => updateValue("audience", event.target.value)}
                value={values.audience}
              />
            </Field>
            <Field htmlFor="language" label="Language">
              <Select
                id="language"
                name="language"
                onChange={(event) => updateValue("language", event.target.value)}
                value={values.language}
              >
                <option value="en">English</option>
                <option value="th">Thai</option>
              </Select>
            </Field>
            <Field error={errors.tone} htmlFor="tone" label="Tone">
              <Select
                aria-invalid={Boolean(errors.tone)}
                id="tone"
                name="tone"
                onChange={(event) => updateValue("tone", event.target.value)}
                value={values.tone}
              >
                <option value="clear and friendly">Clear and friendly</option>
                <option value="concise and practical">Concise and practical</option>
                <option value="warm and encouraging">Warm and encouraging</option>
                <option value="expert and precise">Expert and precise</option>
              </Select>
            </Field>
            <Field
              error={errors.educational_level}
              htmlFor="educational_level"
              label="Educational Level"
            >
              <Select
                aria-invalid={Boolean(errors.educational_level)}
                id="educational_level"
                name="educational_level"
                onChange={(event) =>
                  updateValue("educational_level", event.target.value)
                }
                value={values.educational_level}
              >
                <option value="general">General</option>
                <option value="middle school">Middle school</option>
                <option value="high school">High school</option>
                <option value="college">College</option>
                <option value="professional">Professional</option>
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold">Format And Visuals</h3>
            <p className="mt-1 text-sm text-slate-600">
              Set the output shape without choosing backend providers.
            </p>
          </div>
          <Field
            error={errors.visual_style}
            htmlFor="visual_style"
            label="Visual Style"
          >
            <Input
              aria-invalid={Boolean(errors.visual_style)}
              id="visual_style"
              name="visual_style"
              onChange={(event) =>
                updateValue("visual_style", event.target.value)
              }
              value={values.visual_style}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              error={errors.target_duration_seconds}
              htmlFor="target_duration_seconds"
              label="Target Duration"
            >
              <Select
                aria-invalid={Boolean(errors.target_duration_seconds)}
                id="target_duration_seconds"
                name="target_duration_seconds"
                onChange={(event) =>
                  updateValue(
                    "target_duration_seconds",
                    Number(event.target.value),
                  )
                }
                value={values.target_duration_seconds}
              >
                {durationOptions.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} seconds
                  </option>
                ))}
              </Select>
            </Field>
            <Field error={errors.slide_count} htmlFor="slide_count" label="Slides">
              <Select
                aria-invalid={Boolean(errors.slide_count)}
                id="slide_count"
                name="slide_count"
                onChange={(event) =>
                  updateValue("slide_count", Number(event.target.value))
                }
                value={values.slide_count}
              >
                {slideCountOptions.map((count) => (
                  <option key={count} value={count}>
                    {count} slides
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              error={errors.aspect_ratio}
              htmlFor="aspect_ratio"
              label="Aspect Ratio"
            >
              <div
                aria-label="Aspect Ratio"
                className="grid grid-cols-2 gap-2"
                role="group"
              >
                {(["9:16", "16:9"] as const).map((ratio) => (
                  <button
                    aria-pressed={values.aspect_ratio === ratio}
                    className={cn(
                      "min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition",
                      values.aspect_ratio === ratio
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                    key={ratio}
                    onClick={() => updateValue("aspect_ratio", ratio)}
                    type="button"
                  >
                    {ratio}
                  </button>
                ))}
              </div>
              <input
                id="aspect_ratio"
                name="aspect_ratio"
                readOnly
                type="hidden"
                value={values.aspect_ratio}
              />
            </Field>
            <Field
              error={errors.target_platform}
              htmlFor="target_platform"
              label="Target Platform"
            >
              <Select
                aria-invalid={Boolean(errors.target_platform)}
                id="target_platform"
                name="target_platform"
                onChange={(event) =>
                  updateValue(
                    "target_platform",
                    event.target.value as CreateJobFormValues["target_platform"],
                  )
                }
                value={values.target_platform}
              >
                <option value="shorts">Shorts</option>
                <option value="youtube">YouTube</option>
                <option value="presentation">Presentation</option>
                <option value="generic">Generic</option>
              </Select>
            </Field>
          </div>
          <Toggle
            checked={values.subtitles}
            label="Include subtitles"
            name="subtitles"
            onChange={(event) => updateValue("subtitles", event.target.checked)}
          />
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold">Constraints</h3>
            <p className="mt-1 text-sm text-slate-600">
              Add optional comma-separated guidance for the generated slideshow.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              error={errors.must_include}
              hint="Comma-separated. Example: sunlight, leaves, water"
              htmlFor="must_include"
              label="Must Include"
            >
              <TagInput
                aria-invalid={Boolean(errors.must_include)}
                id="must_include"
                name="must_include"
                onChange={(event) =>
                  updateValue("must_include", event.target.value)
                }
                value={values.must_include}
              />
            </Field>
            <Field
              error={errors.must_avoid}
              hint="Comma-separated. Example: dense text, watermarks"
              htmlFor="must_avoid"
              label="Must Avoid"
            >
              <TagInput
                aria-invalid={Boolean(errors.must_avoid)}
                id="must_avoid"
                name="must_avoid"
                onChange={(event) => updateValue("must_avoid", event.target.value)}
                value={values.must_avoid}
              />
            </Field>
          </div>
        </div>
      </Card>

      {submitError ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-4"
          role="alert"
        >
          <p className="text-sm font-medium text-red-900">
            {submitError.message}
          </p>
          {submitError.technical ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-red-800">
                Technical details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs text-red-950">
                {submitError.technical}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Button
          disabled={isSubmitting}
          onClick={() => {
            setValues(CREATE_JOB_FORM_DEFAULTS);
            setErrors({});
            setSubmitError(null);
          }}
          type="button"
          variant="secondary"
        >
          Reset
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating job..." : "Create slideshow job"}
        </Button>
      </div>
    </form>
  );
}

function mapCreateJobError(error: unknown): SubmitError {
  if (!isApiClientError(error)) {
    return { message: "Could not create the slideshow job." };
  }

  const technical = JSON.stringify(
    {
      status: error.status,
      category: error.category,
      message: error.message,
      code: error.code,
      details: error.details,
    },
    null,
    2,
  );

  if (error.category === "validation") {
    return {
      message: "Check the form fields and try again.",
      technical,
    };
  }

  if (error.category === "network") {
    return {
      message: "Backend is unavailable. Check that the API is running.",
      technical,
    };
  }

  if (error.category === "server") {
    return {
      message: "The backend could not create the job.",
      technical,
    };
  }

  return {
    message: "Could not create the slideshow job.",
    technical,
  };
}

