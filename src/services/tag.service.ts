import { PrismaClient } from '@prisma/client'
import { CreateTagRequest, UpdateTagRequest, TagsQueryParams, TagResponse, TagsResponse, TagWithBookmarks } from '../types/tag.types'
import { AppError } from '../utils/error'

export class TagService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createTag(userId: string, data: CreateTagRequest): Promise<TagResponse> {
    const existingTag = await this.prisma.tag.findUnique({
      where: {
        userId_name: {
          userId,
          name: data.name
        }
      }
    })

    if (existingTag) {
      throw new AppError('이미 존재하는 태그입니다', 400)
    }

    const tag = await this.prisma.tag.create({
      data: {
        name: data.name,
        userId
      },
      include: {
        _count: {
          select: { bookmarks: true }
        }
      }
    })

    return {
      id: tag.id,
      name: tag.name,
      userId: tag.userId,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
      bookmarkCount: tag._count.bookmarks
    }
  }

  async getTags(userId: string, params: TagsQueryParams = {}): Promise<TagsResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = params

    const skip = (page - 1) * limit

    const where = {
      userId,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const
        }
      })
    }

    const orderBy = (() => {
      switch (sortBy) {
        case 'bookmarkCount':
          return { bookmarks: { _count: sortOrder } }
        case 'name':
        case 'createdAt':
        case 'updatedAt':
          return { [sortBy]: sortOrder }
        default:
          return { name: sortOrder }
      }
    })()

    const [tags, total] = await this.prisma.$transaction([
      this.prisma.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { bookmarks: true }
          }
        }
      }),
      this.prisma.tag.count({ where })
    ])

    return {
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        userId: tag.userId,
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
        bookmarkCount: tag._count.bookmarks
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getTagById(userId: string, tagId: string): Promise<TagResponse> {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId
      },
      include: {
        _count: {
          select: { bookmarks: true }
        }
      }
    })

    if (!tag) {
      throw new AppError('태그를 찾을 수 없습니다', 404)
    }

    return {
      id: tag.id,
      name: tag.name,
      userId: tag.userId,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
      bookmarkCount: tag._count.bookmarks
    }
  }

  async updateTag(userId: string, tagId: string, data: UpdateTagRequest): Promise<TagResponse> {
    const existingTag = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId
      }
    })

    if (!existingTag) {
      throw new AppError('태그를 찾을 수 없습니다', 404)
    }

    if (data.name) {
      const duplicateTag = await this.prisma.tag.findFirst({
        where: {
          userId,
          name: data.name,
          NOT: {
            id: tagId
          }
        }
      })

      if (duplicateTag) {
        throw new AppError('이미 존재하는 태그입니다', 400)
      }
    }

    const updatedTag = await this.prisma.tag.update({
      where: { id: tagId },
      data,
      include: {
        _count: {
          select: { bookmarks: true }
        }
      }
    })

    return {
      id: updatedTag.id,
      name: updatedTag.name,
      userId: updatedTag.userId,
      createdAt: updatedTag.createdAt.toISOString(),
      updatedAt: updatedTag.updatedAt.toISOString(),
      bookmarkCount: updatedTag._count.bookmarks
    }
  }

  async deleteTag(userId: string, tagId: string): Promise<void> {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId
      }
    })

    if (!tag) {
      throw new AppError('태그를 찾을 수 없습니다', 404)
    }

    await this.prisma.tag.delete({
      where: { id: tagId }
    })
  }

  async getTagWithBookmarks(userId: string, tagId: string, page: number = 1, limit: number = 20): Promise<TagWithBookmarks & { pagination: any }> {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId
      }
    })

    if (!tag) {
      throw new AppError('태그를 찾을 수 없습니다', 404)
    }

    const skip = (page - 1) * limit

    const [bookmarks, total] = await this.prisma.$transaction([
      this.prisma.bookmark.findMany({
        where: {
          userId,
          tags: {
            some: {
              tagId
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          personalTitle: true,
          createdAt: true,
          websiteMetadata: {
            select: {
              url: true,
              title: true
            }
          }
        }
      }),
      this.prisma.bookmark.count({
        where: {
          userId,
          tags: {
            some: {
              tagId
            }
          }
        }
      })
    ])

    return {
      id: tag.id,
      name: tag.name,
      userId: tag.userId,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      bookmarks: bookmarks.map(bookmark => ({
        id: bookmark.id,
        title: bookmark.personalTitle || bookmark.websiteMetadata?.title || 'Untitled',
        url: bookmark.websiteMetadata?.url || '',
        createdAt: bookmark.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async findOrCreateTags(userId: string, tagNames: string[]): Promise<string[]> {
    const existingTags = await this.prisma.tag.findMany({
      where: {
        userId,
        name: {
          in: tagNames
        }
      }
    })

    const existingTagNames = existingTags.map(tag => tag.name)
    const newTagNames = tagNames.filter(name => !existingTagNames.includes(name))

    if (newTagNames.length > 0) {
      await this.prisma.tag.createMany({
        data: newTagNames.map(name => ({
          name,
          userId
        }))
      })
    }

    const allTags = await this.prisma.tag.findMany({
      where: {
        userId,
        name: {
          in: tagNames
        }
      }
    })

    return allTags.map(tag => tag.id)
  }
}