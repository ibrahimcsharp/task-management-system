import { DateCount, NameCount } from './common';
import { TaskItem } from './task';

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  /** 0..100, one decimal place. */
  completionRate: number;
  totalProjects: number;
  activeProjects: number;
  byStatus: NameCount[];
  byPriority: NameCount[];
  completedLast14Days: DateCount[];
  upcomingTasks: TaskItem[];
}
