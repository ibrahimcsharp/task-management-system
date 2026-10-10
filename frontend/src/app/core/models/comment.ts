export interface Comment {
  id: number;
  taskId: number;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CommentRequest {
  body: string;
}
