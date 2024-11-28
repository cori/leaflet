"use server";

import { drizzle } from "drizzle-orm/postgres-js";
import { entities, phone_rsvps_to_entity } from "drizzle/schema";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { v7 } from "uuid";
import { sql } from "drizzle-orm";
import { Database } from "supabase/database.types";
import { createServerClient } from "@supabase/ssr";

export async function submitRSVP(args: {
  phone_number: string;
  entity: string;
  status: Database["public"]["Enums"]["rsvp_status"];
}) {
  const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
  const db = drizzle(client);

  await db.transaction(async (tx) => {
    await tx.insert(phone_rsvps_to_entity).values([
      {
        phone_number: args.phone_number,
        status: args.status,
        entity: args.entity,
      },
    ]);
  });

  client.end();
  return { success: true };
}
