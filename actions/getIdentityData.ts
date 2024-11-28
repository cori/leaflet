"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import {
  entities,
  phone_number_auth_tokens,
  phone_rsvps_to_entity,
} from "drizzle/schema";
import { cookies } from "next/headers";
import { Database } from "supabase/database.types";

export async function getIdentityData(entity_sets: string[]) {
  const token = cookies().get("auth_token");

  if (!token) {
    return null;
  }

  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  const [authToken] = await db
    .select()
    .from(phone_number_auth_tokens)
    .where(eq(phone_number_auth_tokens.id, token.value));

  if (!authToken || !authToken.confirmed) {
    client.end();
    if (authToken.confirmed) return { authToken };
    return null;
  }

  const rsvps = await db
    .select()
    .from(phone_rsvps_to_entity)
    .innerJoin(entities, eq(entities.id, phone_rsvps_to_entity.entity))
    .where(
      and(
        eq(phone_rsvps_to_entity.phone_number, authToken.phone_number),
        inArray(entities.set, entity_sets),
      ),
    );

  client.end();
  return { authToken, rsvps };
}
