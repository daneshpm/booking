'use server';

/**
 * Re-export actions from @bookings/feature-workflows to preserve backward compatibility.
 * Core workflow mutations and schemas live in the modular @bookings/feature-workflows package.
 */
export {
  createWorkflowAction,
  updateWorkflowAction,
  toggleWorkflowAction,
  deleteWorkflowAction,
  type WorkflowActionResult,
  type WorkflowInput,
  workflowSchema,
} from '@bookings/feature-workflows';
