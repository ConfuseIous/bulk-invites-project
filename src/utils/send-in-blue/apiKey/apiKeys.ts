import { PrismaClient } from "@prisma/client";
import { GetAPIKeyResponseBody } from "../types/GetAPIKeyResponseBody";

export default async function getAPIKey(
  numEmails: number
): Promise<GetAPIKeyResponseBody> {
  const client = new PrismaClient();
  const key = await client.sIBKey.findFirst({
    where: {
      uses: {
        gte: numEmails,
      },
    },
  });

  if (!key) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    key,
  };
}
