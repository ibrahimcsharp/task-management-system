import { UserRole } from './common';

export interface User {
  id: number;
  userName: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/** Lightweight option used by assignee / owner dropdowns. */
export interface UserLookup {
  id: number;
  userName: string;
  fullName: string;
  email: string;
}

export interface UserProfile {
  user: User;
  assignedTaskCount: number;
  createdTaskCount: number;
  projectCount: number;
}

export interface AuthResult {
  token: string;
  tokenType: string;
  expiresAtUtc: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  fullName: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SetUserStatusRequest {
  isActive: boolean;
}

export interface SetUserRoleRequest {
  role: UserRole;
}
