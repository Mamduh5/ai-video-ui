import type { TextareaHTMLAttributes } from "react";

import { Textarea } from "./Textarea";

export function TagInput(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <Textarea rows={3} {...props} />;
}

