import { bangkokTime } from "../lib/autopilotTime";

export type FailureDetail = {
  code: string;
  stage: string;
  source: string;
  message: string;
  retryable?: boolean;
  occurred_at?: string;
  diagnostic_reference?: string;
  next_retry_at?: string;
};

export function AutopilotFailure({ detail }: { detail: FailureDetail }) {
  return <div className="space-y-1 text-amber-800" role="status">
    <p>{detail.message}</p>
    {detail.next_retry_at && <p>Automatic retry: <time dateTime={detail.next_retry_at}>{bangkokTime(detail.next_retry_at)}</time></p>}
    {!detail.next_retry_at && !detail.retryable && <p>See Diagnostics for the affected {detail.stage} stage.</p>}
    {detail.diagnostic_reference && <p className="text-xs">Diagnostic reference: {detail.diagnostic_reference}</p>}
  </div>;
}
