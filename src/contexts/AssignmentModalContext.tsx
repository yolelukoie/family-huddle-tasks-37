import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Task } from "@/lib/types";
import { TaskAssignmentModal } from "@/components/modals/TaskAssignmentModal";

type Ctx = {
  openAssignmentModal: (task: Task) => void;
  closeAssignmentModal: () => void;
};

const AssignmentModalCtx = createContext<Ctx | null>(null);

export function AssignmentModalProvider({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<Task | null>(null);

  // DEBUG: Log whenever task state changes
  useEffect(() => {
    console.log('[MODAL-DEBUG] 6. AssignmentModalProvider task state changed:', {
      hasTask: !!task,
      taskId: task?.id,
      taskName: task?.name,
      familyId: task?.familyId,
      open: !!task,
      timestamp: new Date().toISOString()
    });
  }, [task]);

  const openAssignmentModal = useCallback((t: Task) => {
    console.log('[MODAL-DEBUG] 5. openAssignmentModal invoked:', {
      incomingTaskId: t.id,
      incomingTaskName: t.name,
      incomingFamilyId: t.familyId,
      timestamp: new Date().toISOString()
    });
    
    setTask((current) => {
      const willUpdate = current?.id !== t.id;
      console.log('[MODAL-DEBUG] 5b. setTask callback:', {
        currentTaskId: current?.id,
        willUpdate,
        newTaskId: t.id
      });
      return willUpdate ? t : current;
    });
  }, []);

  const closeAssignmentModal = useCallback(() => {
    console.log('[MODAL-DEBUG] closeAssignmentModal called');
    setTask(null);
  }, []);

  console.log('[MODAL-DEBUG] 7. AssignmentModalProvider render:', {
    hasTask: !!task,
    taskId: task?.id,
    open: !!task
  });

  return (
    <AssignmentModalCtx.Provider value={{ openAssignmentModal, closeAssignmentModal }}>
      {children}
      <TaskAssignmentModal
        open={!!task}
        onOpenChange={(open) => { 
          console.log('[MODAL-DEBUG] onOpenChange called:', { open, willClose: !open });
          if (!open) setTask(null); 
        }}
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