import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { BulkEmailRequestBody } from "../../../types/BulkEmailRequestBody";
import sendNotificationEmail from "./bulkSendNotificationEmails";

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
    // Check if company name already exists
    let company = await prisma.companies.findFirst({
      where: { name: invite.companyName },
    });

    if (!company) {
      // Create company if it doesn't exist
      company = await prisma.companies.create({
        data: {
          name: invite.companyName,
          users: {},
        },
      });
    }

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

  // Format data for SIB
  const data: BulkEmailRequestBody = {
    messageVersions: emailsForSuccessfullyCreatedInvites.map((email) => ({
      to: [
        {
          email,
          name: invites.find((invite) => invite.email === email)?.name ?? "",
        },
      ],
      params: {
        name: email,
        message: "You have been invited to join SIWMA.",
      },
    })),
  };

  // Send email to successfully created invites
  let response = await sendNotificationEmail(data);

  // If there was an error sending the email, return error
  if (response.success) {
    return res.status(200).json({
      message: `Successfully created and sent invites for ${emailsForSuccessfullyCreatedInvites.join(
        ", "
      )}. There was an error processing invites for ${emailsForUnsuccessfullyCreatedInvites.join(
        ", "
      )}.`,
    });
  } else {
    return res.status(400).json({
      error: `Successfully created invites for ${emailsForSuccessfullyCreatedInvites.join(
        ", "
      )}, but there was an error scheduling emails to be sent to these users. Message: ${response.message}`,
    });
  }
}
