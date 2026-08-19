// types/post.ts
export type PostDoc = {
  id: string;
  title: string;
  hashtags: string[];
  abstract: string;
  body: string;
  createdAt: number;
  authorRole: "admin";
};
