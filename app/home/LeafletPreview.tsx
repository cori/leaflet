"use client";
import { BlockPreview, PagePreview } from "components/Blocks/PageLinkBlock";
import {
  ThemeBackgroundProvider,
  ThemeProvider,
} from "components/ThemeManager/ThemeProvider";
import { useRef, useState } from "react";
import { Link } from "react-aria-components";
import { useBlocks } from "src/hooks/queries/useBlocks";
import {
  PermissionToken,
  useEntity,
  useReferenceToEntity,
  useReplicache,
} from "src/replicache";
import { deleteLeaflet } from "actions/deleteLeaflet";
import { removeDocFromHome } from "./storage";
import { mutate } from "swr";
import useMeasure from "react-use-measure";
import { ButtonPrimary } from "components/Buttons";
import { LeafletOptions } from "./LeafletOptions";
import { CanvasContent } from "components/Canvas";
import { useSubscribe } from "replicache-react";
import { TemplateSmall } from "components/Icons";
import { theme } from "tailwind.config";
import { useTemplateState } from "./CreateNewButton";

export const LeafletPreview = (props: {
  token: PermissionToken;
  leaflet_id: string;
}) => {
  let [state, setState] = useState<"normal" | "deleting">("normal");
  let isTemplate = useTemplateState(
    (s) => !!s.templates.find((t) => t.id === props.token.id),
  );
  let root =
    useReferenceToEntity("root/page", props.leaflet_id)[0]?.entity ||
    props.leaflet_id;
  let firstPage = useEntity(root, "root/page")[0];
  let page = firstPage?.data.value || root;

  return (
    <div className="relative max-h-40 h-40">
      <ThemeProvider local entityID={root}>
        <div className="rounded-lg hover:shadow-sm overflow-clip border border-border outline outline-transparent hover:outline-border bg-bg-leaflet grow w-full h-full">
          {state === "normal" ? (
            <Link
              href={"/" + props.token.id}
              className={`no-underline hover:no-underline text-primary h-full`}
            >
              <ThemeBackgroundProvider entityID={root}>
                <div className="leafletPreview grow shrink-0 h-full w-full px-2 pt-2 sm:px-3 sm:pt-3 flex items-end pointer-events-none">
                  <div
                    className="leafletContentWrapper w-full h-full max-w-48 mx-auto border border-border-light border-b-0 rounded-t-md overflow-clip"
                    style={{
                      backgroundColor:
                        "rgba(var(--bg-page), var(--bg-page-alpha))",
                    }}
                  >
                    <LeafletContent entityID={page} />
                  </div>
                </div>
              </ThemeBackgroundProvider>
            </Link>
          ) : (
            <LeafletAreYouSure token={props.token} setState={setState} />
          )}
        </div>
        <div className="flex justify-end pt-1 shrink-0">
          <LeafletOptions leaflet={props.token} isTemplate={isTemplate} />
        </div>
        <LeafletTemplateIndicator isTemplate={isTemplate} />
      </ThemeProvider>
    </div>
  );
};

const LeafletContent = (props: { entityID: string }) => {
  let type = useEntity(props.entityID, "page/type")?.data.value || "doc";
  let blocks = useBlocks(props.entityID);
  let previewRef = useRef<HTMLDivElement | null>(null);
  let [ref, dimensions] = useMeasure();

  if (type === "canvas")
    return (
      <div
        ref={ref}
        className={`pageLinkBlockPreview shrink-0 h-full w-full overflow-clip relative bg-bg-page shadow-sm  rounded-md`}
      >
        <div
          className={`absolute top-0 left-0 origin-top-left pointer-events-none `}
          style={{
            width: `1272px`,
            height: "calc(1272px * 2)",
            transform: `scale(calc((${dimensions.width} / 1272 )))`,
          }}
        >
          <CanvasContent entityID={props.entityID} preview />
        </div>
      </div>
    );

  return (
    <div
      ref={previewRef}
      className={`pageLinkBlockPreview w-full h-full overflow-clip flex flex-col gap-0.5 no-underline relative`}
    >
      <div className="w-full" ref={ref} />
      <div
        className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
        style={{
          width: `var(--page-width-units)`,
          transform: `scale(calc(${dimensions.width} / var(--page-width-unitless)))`,
        }}
      >
        {blocks.slice(0, 10).map((b, index, arr) => {
          return (
            <BlockPreview
              pageType="doc"
              entityID={b.value}
              previousBlock={arr[index - 1] || null}
              nextBlock={arr[index + 1] || null}
              nextPosition={""}
              previewRef={previewRef}
              {...b}
              key={b.factID}
            />
          );
        })}
      </div>
    </div>
  );
};

const LeafletAreYouSure = (props: {
  token: PermissionToken;
  setState: (s: "normal" | "deleting") => void;
}) => {
  return (
    <div
      className="leafletContentWrapper w-full h-full px-1 pt-1 sm:px-[6px] sm:pt-2 flex flex-col gap-2 justify-center items-center "
      style={{
        backgroundColor: "rgba(var(--bg-page), var(--bg-page-alpha))",
      }}
    >
      <div className="font-bold text-center">
        Permanently delete this Leaflet?
      </div>
      <div className="flex gap-2 font-bold ">
        <ButtonPrimary
          compact
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteLeaflet(props.token);
            removeDocFromHome(props.token);
            mutate("leaflets");
          }}
        >
          Delete
        </ButtonPrimary>
        <button
          className="text-accent-1"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            props.setState("normal");
          }}
        >
          Nevermind
        </button>
      </div>
    </div>
  );
};

const LeafletTemplateIndicator = (props: { isTemplate: boolean }) => {
  if (!props.isTemplate) return;

  return (
    <div className="absolute -top-3 right-1">
      <TemplateSmall fill={theme.colors["bg-page"]} />
    </div>
  );
};
