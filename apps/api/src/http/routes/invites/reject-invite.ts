import { auth } from "@/http/middlewares/auth";
import { prisma } from "@/lib/prisma";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { BadRequestError } from "../_errors/bad-request-error";

export async function rejectInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).delete('/invites/:inviteId/reject', {
    schema: {
      tags: ['Invites'],
      summary: 'Reject an invite.',
      params: z.object({
        inviteId: z.url()
      }),
      response: {
        204: z.null()
      }
    }
  }, async (request, reply) => {
    const userId = await request.getCurrentUserId()
    const { inviteId } = request.params

    const invite = await prisma.invite.findUnique({
      where: {
        id: inviteId
      },
    })

    if (!invite) {
      throw new BadRequestError('Invite not found or expired.')
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!user) {
      throw new BadRequestError('User not found.')
    }

    if (invite.email !== user.email) {
      throw new BadRequestError('This invite belongs to another  user.')
    }
    await prisma.invite.delete({
      where: {
        id: inviteId
      }
    })



    return reply.status(204).send()
  })
}