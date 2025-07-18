import { auth } from "@/http/middlewares/auth";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/utils/get-user-permissions";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { UnauthorizedError } from "../_errors/unauthorized-error";

export async function getProjects(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).post('/organizations/:slug/projects', {
    schema: {
      tags: ['Project'],
      summary: 'Get all  organization projects.',
      security: [
        { bearerAuth: [] }
      ],
      params: z.object({
        slug: z.string()
      }),
      response: {
        200: z.object({
          projects: z.array(
            z.object({
              id: z.uuid(),
              name: z.string(),
              slug: z.string(),
              avatarUrl: z.url().nullable(),
              ownerId: z.uuid(),
              organizationId: z.uuid(),
              description: z.string(),
              createdAt: z.date(),
              owner: z.object({
                id: z.uuid(),
                name: z.string().nullable(),
                avatarUrl: z.url().nullable()
              }),
            })
          )
        })
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params
    const userId = await request.getCurrentUserId()
    const { membership, organization } = await request.getUserMembership(slug)


    const { cannot } = getUserPermissions(userId, membership.role)


    if (cannot('get', 'Project')) {
      throw new UnauthorizedError(`You're not allowed to see organization projects.`)
    }


    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        ownerId: true,
        avatarUrl: true,
        organizationId: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        }
      },
      where: {
        organizationId: organization.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return reply.status(201).send({ projects })
  })
}