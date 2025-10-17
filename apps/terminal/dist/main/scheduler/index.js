class Scheduler {
    tasks = new Map();
    timers = new Map();
    register(task) {
        this.tasks.set(task.id, task);
        this.schedule(task);
    }
    unregister(taskId) {
        this.tasks.delete(taskId);
        const timer = this.timers.get(taskId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(taskId);
        }
    }
    schedule(task, attempt = 0) {
        const timer = setTimeout(async () => {
            try {
                await task.run();
                this.schedule(task, 0);
            }
            catch (error) {
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
    computeDelay(options, attempt) {
        const { intervalMs, backoffFactor = 2, jitterMs = 250 } = options;
        const backoff = intervalMs * Math.pow(backoffFactor, attempt);
        const jitter = Math.floor(Math.random() * jitterMs);
        return backoff + jitter;
    }
}
export const scheduler = new Scheduler();
