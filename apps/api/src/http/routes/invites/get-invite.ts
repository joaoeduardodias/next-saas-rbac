import { prisma } from "@/lib/prisma";
import { roleSchema } from "@sass/auth";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { BadRequestError } from "../_errors/bad-request-error";

export async function getInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/invites/:inviteId', {
    schema: {
      tags: ['Invites'],
      summary: 'Get an invite.',
      params: z.object({
        inviteId: z.url()
      }),
      response: {
        200: z.object({
          invite: z.object({
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
        })
      }
    }
  }, async (request) => {
    const { inviteId } = request.params

    const invite = await prisma.invite.findUnique({
      where: {
        id: inviteId
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

    if (!invite) {
      throw new BadRequestError('Invite not found.')
    }

    return { invite }
  })
}