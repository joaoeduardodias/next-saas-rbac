import { auth } from "@/http/middlewares/auth";
import { prisma } from "@/lib/prisma";
import { roleSchema } from "@sass/auth";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { BadRequestError } from "../_errors/bad-request-error";

export async function getPendingInvites(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).get('/pending-invites', {
    schema: {
      tags: ['Invites'],
      summary: 'Get all user pending invites.',
      response: {
        200: z.object({
          invites: z.array(
            z.object({
              id: z.uuid(),
              email: z.email(),
              createdAt: z.date(),
              role: roleSchema,
              author: z.object({
                id: z.uuid(),
                name: z.string().nullable(),
                avatarUrl: z.url().nullable(),
              }).nullable(),
              organization: z.object({
                name: z.string(),
              })
            })
          )
        })
      }
    }
  }, async (request) => {
    const userId = await request.getCurrentUserId()
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      throw new BadRequestError('User not found.')
    }

    const invites = await prisma.invite.findMany({
      where: {
        email: user.email
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        },
        organization: {
          select: {
            name: true
          }
        }
      }
    })

    return { invites }
  })
}