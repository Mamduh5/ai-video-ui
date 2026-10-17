import { useState } from "react";

type DrawerState = { projectId: string; completed: boolean; open: boolean };

/** Completion opens a drawer once per project; refetches keep the user's choice. */
export function useProjectDrawer(projectId: string, completed: boolean) {
  const [state, setState] = useState<DrawerState>(() => ({ projectId, completed, open: completed }));
  let current = state;
  if (state.projectId !== projectId) {
    current = { projectId, completed, open: completed };
    setState(current);
  } else if (completed && !state.completed) {
    current = { ...state, completed: true, open: true };
    setState(current);
  }
  return { open: current.open, setOpen: (open: boolean) => setState({ ...current, open }) };
}
