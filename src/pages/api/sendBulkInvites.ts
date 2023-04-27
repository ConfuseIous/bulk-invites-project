import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

export const sendBulkInvitesSchema = z.array(
  z.object({
    name: z.string(),
    phone: z.string(),
    companyName: z.string(),
    email: z.string(),
  })
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prisma = new PrismaClient();

  // Validate request body
  const parsedBody = sendBulkInvitesSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({ error: parsedBody.error });
  }

  const invites = parsedBody.data;

  // Verify that at least one invite is provided
  if (invites.length === 0) {
    return res.status(400).json({ error: "No invites provided" });
  }

  // Store emails for successfully created invites to be sent via SIB
  const emailsForSuccessfullyCreatedInvites: string[] = [];

  // Store emails for unsuccessfully created invites to show in error message
  const emailsForUnsuccessfullyCreatedInvites: string[] = [];

  invites.forEach(async (invite) => {
    // Verify that company name does not already exist
    const existingCompany = await prisma.companies.findFirst({
      where: { name: invite.companyName },
    });

    if (existingCompany) {
      return res.status(400).json({
        error: `Company with name ${invite.companyName} already exists`,
      });
    }

    // Create company
    const company = await prisma.companies.create({
      data: { name: invite.companyName },
    });

    // Create user
    const user = await prisma.users.create({
      data: {
        email: invite.email,
        name: invite.name,
        phone: invite.phone,
        // Password is automatically set to name + random number from 10000 to 99999
        // User should be prompted to change password on first login
        password: `${invite.name}${Math.floor(Math.random() * 90000) + 10000}`,
        companies: {
          connect: { id: company.id },
        },
      },
    });

    user
      ? emailsForSuccessfullyCreatedInvites.push(invite.email)
      : emailsForUnsuccessfullyCreatedInvites.push(invite.email);
  });

  // Send email to successfully created invites
}
