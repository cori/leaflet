"use server";

import { randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { phone_number_auth_tokens } from "drizzle/schema";

async function sendAuthCode(phoneNumber: string, code: string) {
  // TODO: Actually send SMS, for now just log
  console.log(`Sending auth code ${code} to ${phoneNumber}`);
}

export async function createPhoneAuthToken(phoneNumber: string) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  const code = randomBytes(3).toString("hex").toUpperCase();

  const [token] = await db
    .insert(phone_number_auth_tokens)
    .values({
      phone_number: phoneNumber,
      confirmation_code: code,
      confirmed: false,
    })
    .returning({
      id: phone_number_auth_tokens.id,
    });

  await sendAuthCode(phoneNumber, code);

  client.end();
  return token.id;
}
