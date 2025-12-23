import { logErrorLoki } from './lokiConfig.js';

// Tracking state
interface TaskInfo {
  id: string;
  context: string;
  startTime: number;
  promise: Promise<any>;
}

interface CompletedTaskInfo {
  id: string;
  context: string;
  startTime: number;
  endTime: number;
  durationMs: number;
}

class BackgroundTaskTracker {
  private activeTasks: TaskInfo[] = [];
  private completedTasks: CompletedTaskInfo[] = [];
  private taskIdCounter = 0;
  private readonly maxCompletedTasksHistory = 100; // Limit history to prevent memory leaks

  /**
   * Get the current count of active background tasks
   */
  getActiveTaskCount(): number {
    return this.activeTasks.length;
  }

  /**
   * Get all active tasks with elapsed time
   */
  getActiveTasks(): ReadonlyArray<Omit<TaskInfo, 'promise'> & { elapsedMs: number }> {
    return this.activeTasks.map(({ id, context, startTime }) => ({
      id,
      context,
      startTime,
      elapsedMs: Date.now() - startTime
    }));
  }

  /**
   * Get recently completed tasks
   */
  getCompletedTasks(): ReadonlyArray<CompletedTaskInfo> {
    return [...this.completedTasks];
  }

  /**
   * Get tasks filtered by context
   */
  getTasksByContext(context: string): ReadonlyArray<Omit<TaskInfo, 'promise'> & { elapsedMs: number }> {
    return this.getActiveTasks().filter(task => task.context === context);
  }

  /**
   * Get completed tasks filtered by context
   */
  getCompletedTasksByContext(context: string): ReadonlyArray<CompletedTaskInfo> {
    return this.completedTasks.filter(task => task.context === context);
  }

  /**
   * Add a task to the tracker
   */
  private addTask(taskFn: () => Promise<any>, context: string): Promise<any> {
    const id = `task_${++this.taskIdCounter}`;
  
    const startTime = Date.now();
    
    const taskPromise = taskFn().finally(() => {
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      
      // Remove task from active tasks when completed
      const index = this.activeTasks.findIndex(task => task.id === id);
      if (index !== -1) {
        const removedTask = this.activeTasks.splice(index, 1)[0];
        
        // Add to completed tasks history
        this.completedTasks.unshift({
          id,
          context: removedTask.context,
          startTime,
          endTime,
          durationMs
        });
        
        // Limit the history size to prevent memory leaks
        if (this.completedTasks.length > this.maxCompletedTasksHistory) {
          this.completedTasks.pop();
        }
      }
    });
    
    this.activeTasks.push({
      id,
      context: context || 'Unknown',
      startTime,
      promise: taskPromise
    });
    
    return taskPromise;
  }

  /**
   * Execute functions in the background without blocking the response
   * @param tasks - Array of async functions to execute in parallel
   * @param context - Optional context information for logging
   */
  executeBackgroundTasks(tasks: Array<() => Promise<any>>, context: string = 'Unknown'): void {
    Promise.all(tasks.map(task => this.addTask(task, context))).catch(error => {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);
      const stack = isError ? error.stack : undefined;
      const statusCode = 500; // default or custom code if you have it
      const endpoint = context;

      const formattedLog = `Error: ${message} | Status Code: ${statusCode} | Endpoint: ${endpoint} | Stack: ${stack || 'N/A'}`;

      console.error(`Background task error${context ? ` [${context}]` : ''}:`, message);
      logErrorLoki(formattedLog, true);
    });

    return;
  }

  /**
   * Clear completed task history
   */
  clearCompletedTasksHistory(): void {
    this.completedTasks = [];
  }
}

// Export singleton instance
export const taskTracker = new BackgroundTaskTracker();

// Export the execute function directly for ease of migration
const executeBackgroundTasks = (tasks: Array<() => Promise<any>>, context?: string): void => {
  taskTracker.executeBackgroundTasks(tasks, context);
};

export default executeBackgroundTasks;