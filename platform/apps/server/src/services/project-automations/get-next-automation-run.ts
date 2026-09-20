import cron from "node-cron";

export function getNextAutomationRun(
  cronExpression: string,
  timezone: string,
): Date | null {
  if (!cronExpression) return null;
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid automation cron expression: ${cronExpression}`);
  }

  const task = cron.createTask(cronExpression, () => undefined, { timezone });
  task.start();
  const nextRun = task.getNextRun();
  void task.destroy();
  return nextRun;
}
