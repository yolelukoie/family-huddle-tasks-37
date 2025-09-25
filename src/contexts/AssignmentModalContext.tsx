import React, { createContext, useContext, useState, useCallback } from "react";
import { Task } from "@/lib/types";
import { TaskAssignmentModal } from "@/components/modals/TaskAssignmentModal";

type Ctx = {
  openAssignmentModal: (task: Task) => void;
  closeAssignmentModal: () => void;
};

const AssignmentModalCtx = createContext<Ctx | null>(null);

export function AssignmentModalProvider({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<Task | null>(null);

  const openAssignmentModal = useCallback((t: Task) => {
    setTask((current) => (current?.id === t.id ? current : t)); // de-dupe same task
  }, []);

  const closeAssignmentModal = useCallback(() => setTask(null), []);

  return (
    <AssignmentModalCtx.Provider value={{ openAssignmentModal, closeAssignmentModal }}>
      {children}
      <TaskAssignmentModal
        open={!!task}
        onOpenChange={(open) => { if (!open) setTask(null); }}
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