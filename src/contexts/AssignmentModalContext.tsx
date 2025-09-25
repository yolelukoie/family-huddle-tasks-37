// src/contexts/AssignmentModalContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,            // 👈 import useRef
} from "react";
import { Task } from "@/lib/types";
import { TaskAssignmentModal } from "@/components/modals/TaskAssignmentModal";

type Ctx = {
  openAssignmentModal: (task: Task) => void;
  closeAssignmentModal: () => void;
};

const AssignmentModalCtx = createContext<Ctx | null>(null);

export function AssignmentModalProvider({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<Task | null>(null);

  // ✅ remember tasks already handled/dismissed so the modal doesn't reopen
  const dismissedTaskIds = useRef<Set<string>>(new Set());

  const openAssignmentModal = useCallback((t: Task) => {
    if (!t?.id) return;
    if (dismissedTaskIds.current.has(t.id)) return; // don't reopen same task
    setTask((current) => (current?.id === t.id ? current : t));
  }, []);

  const closeAssignmentModal = useCallback(() => {
    setTask((prev) => {
      if (prev?.id) dismissedTaskIds.current.add(prev.id);
      return null;
    });
  }, []);

  return (
    <AssignmentModalCtx.Provider value={{ openAssignmentModal, closeAssignmentModal }}>
      {children}
      <TaskAssignmentModal
        open={!!task}
        onOpenChange={(open) => { if (!open) closeAssignmentModal(); }}
        task={task}
      />
    </AssignmentModalCtx.Provider>
  );
}

export function useAssignmentModal(): Ctx {
  const ctx = useContext(AssignmentModalCtx);
  if (!ctx) throw new Error("useAssignmentModal must be used within AssignmentModalProvider");
  return ctx;
}
