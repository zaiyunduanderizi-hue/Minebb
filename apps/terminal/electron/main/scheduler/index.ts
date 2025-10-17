type TaskId = string;

export interface ScheduleOptions {
  intervalMs: number;
  maxRetries?: number;
  backoffFactor?: number;
  jitterMs?: number;
}

export interface ScheduledTask {
  id: TaskId;
  run: () => Promise<void>;
  options: ScheduleOptions;
}

class Scheduler {
  private readonly tasks = new Map<TaskId, ScheduledTask>();
  private readonly timers = new Map<TaskId, NodeJS.Timeout>();

  register(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    this.schedule(task);
  }

  unregister(taskId: TaskId): void {
    this.tasks.delete(taskId);
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  private schedule(task: ScheduledTask, attempt = 0): void {
    const timer = setTimeout(async () => {
      try {
        await task.run();
        this.schedule(task, 0);
      } catch (error) {
        const nextAttempt = attempt + 1;
        const { maxRetries = 3 } = task.options;
        if (nextAttempt > maxRetries) {
          this.unregister(task.id);
          // TODO: integrate with logging/monitoring pipeline.
          return;
        }
        this.schedule(task, nextAttempt);
      }
    }, this.computeDelay(task.options, attempt));

    this.timers.set(task.id, timer);
  }

  private computeDelay(options: ScheduleOptions, attempt: number): number {
    const { intervalMs, backoffFactor = 2, jitterMs = 250 } = options;
    const backoff = intervalMs * Math.pow(backoffFactor, attempt);
    const jitter = Math.floor(Math.random() * jitterMs);
    return backoff + jitter;
  }
}

export const scheduler = new Scheduler();
