import { createServerClient } from "@supabase/ssr";
import { Fact } from "src/replicache";
import { Attributes } from "src/replicache/attributes";
import { Database } from "supabase/database.types";
import * as base64 from "base64-js";
import * as Y from "yjs";
import { createElement } from "react";
import { RenderYJSFragment } from "components/Blocks/TextBlock/RenderYJSFragment";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

let supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { cookies: {} },
);
export async function GET(
  request: Request,
  { params }: { params: { leaflet_id: string } },
) {
  let res = await supabase
    .from("permission_tokens")
    .select("*, permission_token_rights(*) ")
    .eq("id", params.leaflet_id)
    .single();
  let rootEntity = res.data?.root_entity;
  if (!rootEntity || !res.data) return Response.json({}, { status: 404 });

  let { data } = await supabase.rpc("get_facts", {
    root: rootEntity,
  });

  let initialFacts = (data as unknown as Fact<keyof typeof Attributes>[]) || [];
  let processed_data = await Promise.all(
    initialFacts.map(async (f) => {
      if (f.attribute === "block/text") {
        let doc = new Y.Doc();
        const update = base64.toByteArray((f as Fact<"block/text">).data.value);
        Y.applyUpdate(doc, update);
        let nodes = doc.getXmlElement("prosemirror").toArray();
        let value = await renderToStaticMarkup(
          createElement(RenderYJSFragment, { node: nodes[0] }),
        );
        console.log(value, nodes);
        return {
          ...f,
          data: {
            type: "text",
            value,
          },
        };
      }
      return f;
    }),
  );
  return Response.json({ root_entity: rootEntity, facts: processed_data });
}

let renderToStaticMarkup = async (node: React.ReactNode) => {
  const ReactDOMServer = (await import("react-dom/server")).default;
  return ReactDOMServer.renderToStaticMarkup(node);
};
