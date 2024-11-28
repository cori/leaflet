"use client";
import { getIdentityData } from "actions/getIdentityData";
import { SWRConfig } from "swr";

export function IdentityProvider(props: {
  data: Awaited<ReturnType<typeof getIdentityData>>;
  children: React.ReactNode;
}) {
  return (
    <SWRConfig value={{ fallback: { identity: props.data } }}>
      {props.children}
    </SWRConfig>
  );
}
