import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { BulkEmailRequestBody } from "../../../types/BulkEmailRequestBody";
import sendNotificationEmail from "./bulkSendInviteEmails";
import { Response } from "../../../types/Response";

const bulkInviteSchema = z.object({
  name: z.string(),
  phone: z.string(),
  companyName: z.string(),
  email: z.string(),
});

export const sendBulkInvitesSchema = z.array(bulkInviteSchema);

export type SendBulkInvitesSchemaType = z.infer<typeof sendBulkInvitesSchema>;
export type BulkInvitesSchemaType = z.infer<typeof bulkInviteSchema>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  const prisma = new PrismaClient();

  // Validate request body
  const parsedBody = sendBulkInvitesSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res
      .status(400)
      .json({ success: false, message: parsedBody.error.toString() });
  }

  const invites = parsedBody.data;

  // Verify that at least one invite is provided
  if (invites.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No invites provided" });
  }

  // Store emails for successfully created invites to be sent via SIB
  const emailsForSuccessfullyCreatedInvites: string[] = [];

  // Store emails for unsuccessfully created invites to show in error message
  const emailsForUnsuccessfullyCreatedInvites: string[] = [];

  const promises = invites.map(async (invite) => {
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

    // Create user in try/catch block to catch duplicate email error
    try {
      await prisma.users.create({
        data: {
          email: invite.email,
          name: invite.name,
          phone: invite.phone,
          // Password is automatically set to name + random number from 10000 to 99999
          // User should be prompted to change password on first login
          // We should also store a hash of the password instead of the password itself
          password: `${invite.name}${
            Math.floor(Math.random() * 90000) + 10000
          }`,
          companies: {
            connect: { id: company.id },
          },
        },
      });

      emailsForSuccessfullyCreatedInvites.push(invite.email);
    } catch (error) {
      emailsForUnsuccessfullyCreatedInvites.push(invite.email);
    }
  });

  await Promise.all(promises);

  // Format data for SIB
  const data: BulkEmailRequestBody = {
    htmlContent: `
    <!DOCTYPE html>
<html>

<body>
    <h3>Hello {{params.name}},</h3>
    <p>You have been invited to join the SIWMA Marketplace as a member of {{params.companyName}}.</p>
    <p>Please click the following link to register your account:
        <a href="{{params.registrationUrl}}">Join the SIWMA Marketplace</a>
    </p>
    <p>
        Thank You,
        <br />
        The SIWMA Marketplace Team
    </p>
    <br />
    <p>If this email was sent to you by mistake, please ignore it.</p>
</body>

</html>
    `,
    messageVersions: emailsForSuccessfullyCreatedInvites.map((email) => ({
      to: [
        {
          email,
          name: invites.find((invite) => invite.email === email)?.name ?? "",
        },
      ],
      params: {
        name: email,
        message: invites.find((invite) => invite.email === email)?.name ?? "",
      },
    })),
  };

  // Send email to successfully created invites
  let response = await sendNotificationEmail(data);

  // If there was an error sending the email, return error
  if (response.success) {
    let message = `Successfully created and sent invites for ${emailsForSuccessfullyCreatedInvites.join(
      ", "
    )}.`;

    if (emailsForUnsuccessfullyCreatedInvites.length > 0) {
      message += ` There was an error processing invites for ${emailsForUnsuccessfullyCreatedInvites.join(
        ", "
      )}.`;
    }

    return res.status(200).json({
      success: true,
      message: message,
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "There was an error sending invites.",
    });
  }
}
