import { FastifyInstance } from 'fastify'
import { prisma } from '../config/database'
import { requireAuth } from '../middleware/auth'
import { TagController } from '../controllers/tag.controller'
import { TagService } from '../services/tag.service'
import {
  CreateTagSchema,
  UpdateTagSchema,
  TagsQuerySchema,
  TagIdParamsSchema,
  TagBookmarksQuerySchema,
  TagsResponseSchema,
  TagWithBookmarksSchema,
  TagSchema
} from '../schemas/tag.schema'

export default async function tagsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth)
  
  const tagService = new TagService(prisma)
  const tagController = new TagController(tagService)

  app.get('/', {
    schema: {
      querystring: TagsQuerySchema,
      response: {
        200: TagsResponseSchema
      }
    }
  }, tagController.getTags.bind(tagController))

  app.get('/:id', {
    schema: {
      params: TagIdParamsSchema,
      response: {
        200: TagSchema
      }
    }
  }, tagController.getTagById.bind(tagController))

  app.post('/', {
    schema: {
      body: CreateTagSchema,
      response: {
        201: TagSchema
      }
    }
  }, tagController.createTag.bind(tagController))

  app.put('/:id', {
    schema: {
      params: TagIdParamsSchema,
      body: UpdateTagSchema,
      response: {
        200: TagSchema
      }
    }
  }, tagController.updateTag.bind(tagController))

  app.delete('/:id', {
    schema: {
      params: TagIdParamsSchema
    }
  }, tagController.deleteTag.bind(tagController))

  app.get('/:id/bookmarks', {
    schema: {
      params: TagIdParamsSchema,
      querystring: TagBookmarksQuerySchema,
      response: {
        200: TagWithBookmarksSchema
      }
    }
  }, tagController.getTagWithBookmarks.bind(tagController))
}