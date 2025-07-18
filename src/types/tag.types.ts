export interface Tag {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    bookmarks: number;
  };
}

export interface CreateTagRequest {
  name: string;
}

export interface UpdateTagRequest {
  name?: string;
}

export interface TagsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'bookmarkCount';
  sortOrder?: 'asc' | 'desc';
}

export interface TagWithBookmarks extends Tag {
  bookmarks: Array<{
    id: string;
    title: string;
    url: string;
    createdAt: Date;
  }>;
}

export interface TagResponse {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  bookmarkCount: number;
}

export interface TagsResponse {
  tags: TagResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
