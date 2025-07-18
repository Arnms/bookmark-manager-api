import { Type, Static } from '@sinclair/typebox'

export const TagSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  userId: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  bookmarkCount: Type.Number({ minimum: 0 })
})

export const CreateTagSchema = Type.Object({
  name: Type.String({ 
    minLength: 1, 
    maxLength: 50,
    description: '태그 이름' 
  })
})

export const UpdateTagSchema = Type.Object({
  name: Type.Optional(Type.String({ 
    minLength: 1, 
    maxLength: 50,
    description: '태그 이름' 
  }))
})

export const TagsQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  search: Type.Optional(Type.String({ description: '태그 이름 검색' })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('name'),
    Type.Literal('createdAt'),
    Type.Literal('updatedAt'),
    Type.Literal('bookmarkCount')
  ], { default: 'name' })),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ], { default: 'asc' }))
})

export const TagIdParamsSchema = Type.Object({
  id: Type.String({ description: '태그 ID' })
})

export const TagBookmarksQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 }))
})

export const TagsResponseSchema = Type.Object({
  tags: Type.Array(TagSchema),
  pagination: Type.Object({
    page: Type.Number(),
    limit: Type.Number(),
    total: Type.Number(),
    totalPages: Type.Number()
  })
})

export const TagWithBookmarksSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  userId: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  bookmarks: Type.Array(Type.Object({
    id: Type.String(),
    title: Type.String(),
    url: Type.String(),
    createdAt: Type.String({ format: 'date-time' })
  })),
  pagination: Type.Object({
    page: Type.Number(),
    limit: Type.Number(),
    total: Type.Number(),
    totalPages: Type.Number()
  })
})

export type TagType = Static<typeof TagSchema>
export type CreateTagType = Static<typeof CreateTagSchema>
export type UpdateTagType = Static<typeof UpdateTagSchema>
export type TagsQueryType = Static<typeof TagsQuerySchema>
export type TagIdParamsType = Static<typeof TagIdParamsSchema>
export type TagBookmarksQueryType = Static<typeof TagBookmarksQuerySchema>
export type TagsResponseType = Static<typeof TagsResponseSchema>
export type TagWithBookmarksType = Static<typeof TagWithBookmarksSchema>