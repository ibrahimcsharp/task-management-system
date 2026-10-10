export interface Attachment {
  id: number;
  taskId: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedById: number;
  uploadedByName: string;
  createdAt: string;
  downloadUrl: string;
}
