import { AddTiny } from "components/Icons";
import { cookies } from "next/headers";
import { Fact, ReplicacheProvider } from "src/replicache";
import { createServerClient } from "@supabase/ssr";
import { Database } from "supabase/database.types";
import { Attributes } from "src/replicache/attributes";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { EntitySetProvider } from "components/EntitySetProvider";
import { ThemePopover } from "components/ThemeManager/ThemeSetter";
import { createIdentity } from "actions/createIdentity";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { IdentitySetter } from "./IdentitySetter";
import { HomeHelp } from "./HomeHelp";
import { LeafletList } from "./LeafletList";
import { CreateNewLeafletButton } from "./CreateNewButton";
import { getIdentityData } from "actions/getIdentityData";
import { IdentityContextProvider } from "components/IdentityProvider";
import { LoginButton, LogoutButton } from "components/LoginButton";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export default async function Home() {
  let cookieStore = cookies();

  let auth_token = cookieStore.get("auth_token")?.value;
  let auth_res = auth_token ? await getIdentityData() : null;
  let identity: string | undefined;
  if (auth_res) identity = auth_res.id;
  else identity = cookieStore.get("identity")?.value;
  let needstosetcookie = false;
  if (!identity) {
    const client = postgres(process.env.DB_URL as string, { idle_timeout: 5 });
    const db = drizzle(client);
    let newIdentity = await createIdentity(db);
    client.end();
    identity = newIdentity.id;
    needstosetcookie = true;
  }

  async function setCookie() {
    "use server";

    cookies().set("identity", identity as string, { sameSite: "strict" });
  }

  let permission_token = auth_res?.permission_tokens;
  if (!permission_token) {
    let res = await supabase
      .from("identities")
      .select(
        `*,
        permission_tokens!identities_home_page_fkey(*, permission_token_rights(*))
      `,
      )
      .eq("id", identity)
      .single();
    permission_token = res.data?.permission_tokens;
  }

  if (!permission_token) return <div>no home page wierdly</div>;
  let { data } = await supabase.rpc("get_facts", {
    root: permission_token.root_entity,
  });
  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  let root_entity = permission_token.root_entity;
  return (
    <IdentityContextProvider initialValue={auth_res}>
      <ReplicacheProvider
        rootEntity={root_entity}
        token={permission_token}
        name={root_entity}
        initialFacts={initialFacts}
      >
        <IdentitySetter cb={setCookie} call={needstosetcookie} />
        <EntitySetProvider
          set={permission_token.permission_token_rights[0].entity_set}
        >
          <ThemeProvider entityID={root_entity}>
            <div className="flex h-full bg-bg-leaflet">
              <ThemeBackgroundProvider entityID={root_entity}>
                <div className="home relative max-w-screen-lg w-full h-full mx-auto flex sm:flex-row flex-col-reverse px-2 sm:px-6 ">
                  <div className="homeOptions z-10 shrink-0 sm:static absolute bottom-0 left-2 right-2 place-self-end sm:place-self-start flex sm:flex-col flex-row-reverse sm:w-fit w-full items-center px-2 sm:px-0 pb-2 pt-2 sm:pt-7 sm:bg-transparent bg-bg-leaflet border-border border-t sm:border-none">
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <CreateNewLeafletButton />
                      <HomeHelp />
                      <ThemePopover entityID={root_entity} home />
                    </div>

                    <hr className="border-border w-full my-3 hidden sm:block" />
                    <div className="grow relative w-8 h-7">
                      <div className="origin-top-left absolute top-0 left-0.5 sm:-rotate-90 whitespace-nowrap sm:translate-y-[66px]">
                        <LoginButton />
                      </div>
                      <LogoutButton />
                    </div>
                  </div>
                  <LeafletList />
                </div>
              </ThemeBackgroundProvider>
            </div>
          </ThemeProvider>
        </EntitySetProvider>
      </ReplicacheProvider>
    </IdentityContextProvider>
  );
}
