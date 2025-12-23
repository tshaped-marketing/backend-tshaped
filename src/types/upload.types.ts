export type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
};

export type UploadResponse = {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};
