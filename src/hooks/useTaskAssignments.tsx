import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/lib/types';

export function useTaskAssignments() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const { tasks } = useTasks();
  const [pendingAssignments, setPendingAssignments] = useState<Task[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<Task | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // Filter tasks assigned to current user that they haven't seen yet
  useEffect(() => {
    if (!user || !activeFamilyId) return;

    const assignedTasks = tasks.filter(task => 
      task.assignedTo === user.id && 
      task.assignedBy !== user.id && // Not self-assigned
      !task.completed &&
      // Check if this is a new assignment (created recently and user hasn't seen it)
      !localStorage.getItem(`task_seen_${task.id}`)
    );

    setPendingAssignments(assignedTasks);

    // Show modal for first pending assignment
    if (assignedTasks.length > 0 && !showAssignmentModal) {
      setCurrentAssignment(assignedTasks[0]);
      setShowAssignmentModal(true);
    }
  }, [tasks, user?.id, activeFamilyId, showAssignmentModal]);

  const handleTaskResponse = (taskId: string, accepted: boolean) => {
    // Mark task as seen
    localStorage.setItem(`task_seen_${taskId}`, 'true');
    
    // Remove from pending assignments
    setPendingAssignments(prev => prev.filter(task => task.id !== taskId));
    
    // If there are more pending assignments, show the next one
    const remainingTasks = pendingAssignments.filter(task => task.id !== taskId);
    if (remainingTasks.length > 0) {
      setCurrentAssignment(remainingTasks[0]);
    } else {
      setCurrentAssignment(null);
      setShowAssignmentModal(false);
    }

    // Log the response for notification purposes
    console.log(`Task ${taskId} was ${accepted ? 'accepted' : 'rejected'} by ${user?.displayName}`);
  };

  const closeAssignmentModal = () => {
    // Mark current task as seen even if no response was given
    if (currentAssignment) {
      localStorage.setItem(`task_seen_${currentAssignment.id}`, 'true');
      setPendingAssignments(prev => prev.filter(task => task.id !== currentAssignment.id));
    }
    
    setShowAssignmentModal(false);
    setCurrentAssignment(null);
  };

  return {
    pendingAssignments,
    currentAssignment,
    showAssignmentModal,
    handleTaskResponse,
    closeAssignmentModal,
  };
}