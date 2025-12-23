export interface CourseHierarchy {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  thumbnail: string | null;
  duration: number | null;
  objectives: any[] | null;
  instructor: {
    id: string;
    name: string;
    avatar: string | null;
    bio: string | null;
  };
  lessons: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    status: string;
    order: number;
    duration: number | null;
    mediaType: string | null;
    mediaUrl: string | null;
    attachments: any[] | null;
    topics: Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      status: string;
      type: string;
      order: number;
      duration: number | null;
      mediaType: string | null;
      mediaUrl: string | null;
      attachments: any[] | null;
      keywords: string[] | null;
    }>;
  }>;
}
