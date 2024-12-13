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
import { LoginButton } from "components/LoginButton";
import { HelpPopover } from "components/HelpPopover";
import { AccountSettings } from "./AccountSettings";

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

  let permission_token = auth_res?.home_leaflet;
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
  let home_docs_initialFacts: {
    [root_entity: string]: Fact<keyof typeof Attributes>[];
  } = {};
  if (auth_res) {
    let all_facts = await supabase.rpc("get_facts_for_roots", {
      max_depth: 3,
      roots: auth_res.permission_token_on_homepage.map(
        (r) => r.permission_tokens.root_entity,
      ),
    });
    if (all_facts.data)
      home_docs_initialFacts = all_facts.data.reduce(
        (acc, fact) => {
          if (!acc[fact.root_id]) acc[fact.root_id] = [];
          acc[fact.root_id].push(
            fact as unknown as Fact<keyof typeof Attributes>,
          );
          return acc;
        },
        {} as { [key: string]: Fact<keyof typeof Attributes>[] },
      );
  }
  return (
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
                <div className="homeWarning  z-10 shrink-0  absolute bottom-2 sm:bottom-14 left-2 right-2 bg-bg-page rounded-md">
                  <div className="px-2 py-1 text-sm text-tertiary flex flex-col gap-1 ">
                    <p className="font-bold">
                      Log In to save Leaflets to your account so they&apos;ll
                      never disappear!
                    </p>
                    <p>
                      Currently, we&apos;re saving them for you in cookies. They
                      will disappear if you clear your cookies.
                    </p>
                  </div>
                </div>
                <div className="homeOptions z-10 shrink-0 sm:static absolute bottom-0 left-2 right-2 place-self-end sm:place-self-start flex sm:flex-col flex-row-reverse sm:w-fit w-full items-center px-2 sm:px-0 pb-2 pt-2 sm:pt-7 sm:bg-transparent bg-bg-page border-border border-t sm:border-none">
                  <div className="flex sm:flex-col flex-row-reverse gap-2 shrink-0 place-self-end">
                    <CreateNewLeafletButton />
                    <ThemePopover entityID={root_entity} home />
                    <HelpPopover noShortcuts />
                    {auth_res && <AccountSettings />}
                  </div>
                  {!auth_res && (
                    <>
                      <hr className="border-border w-full my-3 hidden sm:block" />
                      <div className="grow relative w-8 h-8">
                        <div className="origin-top-left absolute top-0 left-0 sm:-rotate-90 whitespace-nowrap sm:translate-y-[84px]">
                          <LoginButton />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <LeafletList initialFacts={home_docs_initialFacts} />
              </div>
            </ThemeBackgroundProvider>
          </div>
        </ThemeProvider>
      </EntitySetProvider>
    </ReplicacheProvider>
  );
}
