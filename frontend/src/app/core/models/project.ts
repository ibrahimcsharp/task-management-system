export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string;
  ownerId: number;
  ownerName: string;
  isArchived: boolean;
  taskCount: number;
  openTaskCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateProjectRequest {
  name: string;
  description: string | null;
  color: string;
  ownerId?: number | null;
}

export interface UpdateProjectRequest {
  name: string;
  description: string | null;
  color: string;
  isArchived: boolean;
  ownerId?: number | null;
}

/** Preset palette offered by the project form (8 swatches). */
export const PROJECT_COLORS: readonly string[] = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#64748B',
] as const;
