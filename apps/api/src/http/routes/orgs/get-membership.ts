import { auth } from "@/http/middlewares/auth";
import { roleSchema } from "@sass/auth";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";

export async function getMembership(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().register(auth).get('/organizations/:slug/membership', {
    schema: {
      tags: ['Organization'],
      summary: 'Get user membership on organization.',
      security: [{ bearerAuth: [] }],
      params: z.object({
        slug: z.string(),
      }),
      response: {
        200: z.object({
          membership: z.object({
            id: z.uuid(),
            role: roleSchema,
            organizationId: z.uuid()
          }),
        }),
      },
    },
  }, async (request) => {
    const { slug } = request.params
    const { membership } = await request.getUserMembership(slug)

    return {
      membership: {
        id: membership.id,
        role: roleSchema.parse(membership.role),
        organizationId: membership.organizationId,
      }
    }
  })
}