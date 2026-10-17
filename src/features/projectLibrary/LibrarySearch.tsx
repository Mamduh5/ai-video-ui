import { useLayoutEffect, useRef } from "react";
import { useNavigationType } from "react-router-dom";

export function LibrarySearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    // During typing the browser owns the draft. Router replacements can render
    // behind fast keystrokes in a long list; reflecting them would erase input.
    // Back/Forward and filter navigation still synchronize the saved URL value.
    if (navigationType !== "REPLACE" && input.current) input.current.value = value;
  }, [navigationType, value]);
  return <div className="library-search">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
    <input ref={input} type="search" aria-label="Search projects" placeholder="Search title, topic, or project ID..." maxLength={200}
      defaultValue={value} onChange={event => onChange(event.target.value)} />
    {value && <button type="button" aria-label="Clear search" onClick={() => {
      if (input.current) { input.current.value = ""; input.current.focus(); }
      onChange("");
    }}>×</button>}
  </div>;
}
