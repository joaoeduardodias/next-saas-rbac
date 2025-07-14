import { auth } from "@/http/middlewares/auth";
import { prisma } from "@/lib/prisma";
import { roleSchema } from "@sass/auth";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";

export async function getOrganizations(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).get('/organizations', {
    schema: {
      tags: ['Organization'],
      summary: 'Get organization where user is member.',
      security: [
        { bearerAuth: [] }
      ],

      response: {
        200: z.object({
          organizations: z.array(z.object({
            id: z.uuid(),
            name: z.string(),
            slug: z.string(),
            avatarUrl: z.url().nullable(),
            role: roleSchema
          }))
        })
      }
    }
  }, async (request) => {

    const userId = await request.getCurrentUserId()

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        avatarUrl: true,
        members: {
          select: {
            role: true,
          },
          where: {
            userId
          }
        }
      },
      where: {
        members: {
          some: {
            userId
          }
        }
      }
    })

    const organizationsWithUserRole = organizations.map(({ members, ...org }) => {

      return {
        ...org,
        role: members[0].role,
      }
    })

    return { organizations: organizationsWithUserRole }
  })
}