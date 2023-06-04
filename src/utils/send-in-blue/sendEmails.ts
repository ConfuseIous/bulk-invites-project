import { PrismaClient } from "@prisma/client";
import sibClient, { changeAPIKey } from "./sib";
import getAPIKey from "./apiKey/apiKeys";
import { BulkEmailRequestBody } from "../../../types/BulkEmailRequestBody";
import { BulkEmailResponseBody } from "./types/BulkEmailResponseBody";

/* This function sends emails to multiple recipients.
 * It uses SendInBlue's Transactional Email API.
 * You should use this function to send emails to multiple users at once instead of using a single email function multiple times.
 */

export default async function sendEmails(
  data: BulkEmailRequestBody
): Promise<BulkEmailResponseBody> {
  const prisma = new PrismaClient();

  let apiKey: string | undefined;
  let senderEmail: string | undefined;

  // If in development, get the API key from the database.
  const retrieved = await getAPIKey(data.messageVersions.length);
  apiKey = retrieved.key?.key;
  senderEmail = retrieved.key?.sibEmail;

  if (!apiKey) {
    console.log("No API Key found");
    return {
      success: false,
    };
  }

  if (!senderEmail) {
    console.log("No sender email found");
    return {
      success: false,
    };
  }

  console.log(data);

  changeAPIKey(apiKey); // Set the API Key in the SendInBlue client

  const apiInstance = new sibClient.TransactionalEmailsApi();

  const updatedData = {
    htmlContent: data.htmlContent,
    subject: "SIWMA Notifications",
    messageVersions: data.messageVersions,
    sender: {
      email: senderEmail,
      name: "SIWMA Marketplace",
    },
  };

  console.log(data.messageVersions);

  try {
    await apiInstance.sendTransacEmail(updatedData);

    if (process.env.NODE_ENV === "development" && data.messageVersions) {
      // If in development, update the API Key usage count
      await prisma.sIBKey.update({
        where: {
          key: apiKey,
        },
        data: {
          uses: {
            decrement: data.messageVersions.length,
          },
        },
      });
    }

    return {
      success: true,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
    };
  }
}
