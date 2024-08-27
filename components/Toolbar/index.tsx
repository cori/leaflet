"use client";

import React, { useEffect, useState } from "react";
import { CloseTiny, PopoverArrow } from "components/Icons";
import { keepFocus, TextBlockTypeToolbar } from "./TextBlockTypeToolbar";
import { InlineLinkToolbar } from "./InlineLinkToolbar";
import { theme } from "../../tailwind.config";
import { useEditorStates } from "src/state/useEditorState";
import { useUIState } from "src/useUIState";
import { useEntity, useReplicache } from "src/replicache";
import * as Tooltip from "@radix-ui/react-tooltip";
import { addShortcut } from "src/shortcuts";
import { ListToolbar } from "./ListToolbar";
import { HighlightToolbar } from "./HighlightToolbar";
import { TextToolbar } from "./TextToolbar";
import { BlockToolbar, DeleteBlockButton } from "./BlockToolbar";
import { MultiSelectToolbar } from "./MultiSelectToolbar";

export type ToolbarTypes =
  | "default"
  | "highlight"
  | "link"
  | "heading"
  | "list"
  | "linkBlock"
  | "block"
  | "multiSelect";

export const Toolbar = (props: { cardID: string; blockID: string }) => {
  let focusedBlock = useUIState((s) => s.focusedBlock);

  let blockType = useEntity(props.blockID, "block/type")?.data.value;

  let [toolbarState, setToolbarState] = useState<ToolbarTypes>("default");

  let lastUsedHighlight = useUIState((s) => s.lastUsedHighlight);
  let setLastUsedHighlight = (color: "1" | "2" | "3") =>
    useUIState.setState({
      lastUsedHighlight: color,
    });

  let activeEditor = useEditorStates((s) => s.editorStates[props.blockID]);

  let selectedBlocks = useUIState((s) => s.selectedBlock);

  useEffect(() => {
    if (toolbarState !== "default") return;
    let removeShortcut = addShortcut({
      metaKey: true,
      key: "k",
      handler: () => {
        setToolbarState("link");
      },
    });
    return () => {
      removeShortcut();
    };
  }, [toolbarState]);
  useEffect(() => {
    if (blockType !== "heading" && blockType !== "text") {
      setToolbarState("block");
    } else {
      setToolbarState("default");
    }
  }, [blockType]);

  useEffect(() => {
    if (selectedBlocks.length > 1) {
      setToolbarState("multiSelect");
    } else if (toolbarState === "multiSelect") {
      setToolbarState("default");
    }
  }, [selectedBlocks.length, toolbarState]);

  return (
    <Tooltip.Provider>
      <div className="toolbar flex items-center justify-between w-full gap-6">
        <div className="toolbarOptions flex gap-[6px] items-center grow">
          {toolbarState === "default" ? (
            <TextToolbar
              lastUsedHighlight={lastUsedHighlight}
              setToolbarState={(s) => {
                setToolbarState(s);
              }}
            />
          ) : toolbarState === "highlight" ? (
            <HighlightToolbar
              onClose={() => setToolbarState("default")}
              lastUsedHighlight={lastUsedHighlight}
              setLastUsedHighlight={(color: "1" | "2" | "3") =>
                setLastUsedHighlight(color)
              }
            />
          ) : toolbarState === "list" ? (
            <ListToolbar onClose={() => setToolbarState("default")} />
          ) : toolbarState === "link" ? (
            <InlineLinkToolbar
              onClose={() => {
                activeEditor?.view?.focus();
                setToolbarState("default");
              }}
            />
          ) : toolbarState === "heading" ? (
            <TextBlockTypeToolbar onClose={() => setToolbarState("default")} />
          ) : toolbarState === "block" ? (
            <BlockToolbar />
          ) : toolbarState === "multiSelect" ? (
            <MultiSelectToolbar />
          ) : null}
        </div>
        {toolbarState !== "multiSelect" && toolbarState !== "block" && (
          <button
            className="toolbarBackToDefault hover:text-accent-contrast"
            onClick={() => {
              if (toolbarState === "default") {
                useUIState.setState(() => ({
                  focusedBlock: {
                    type: "card",
                    entityID: props.cardID,
                  },
                  selectedBlock: [],
                }));
              } else {
                setToolbarState("default");
                focusedBlock && keepFocus(focusedBlock.entityID);
              }
            }}
          >
            <CloseTiny />
          </button>
        )}
      </div>
    </Tooltip.Provider>
  );
};

export const ToolbarButton = (props: {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  tooltipContent: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) => {
  return (
    // toolbar button does not control the highlight theme setter
    // if toolbar button is updated, be sure to update there as well
    <Tooltip.Root>
      <Tooltip.Trigger
        disabled={props.disabled}
        className={`
          flex items-center rounded-md border border-transparent hover:border-border  active:bg-border-light active:text-primary
          ${props.className}
          ${
            props.active
              ? "bg-border-light text-primary"
              : props.disabled
                ? "text-border cursor-not-allowed"
                : "text-secondary  hover:text-primary"
          }
          `}
        onMouseDown={(e) => {
          e.preventDefault();
          props.onClick && props.onClick(e);
        }}
      >
        {props.children}
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          alignOffset={12}
          className="z-10 bg-border rounded-md py-1 px-[6px] font-bold text-secondary text-sm"
        >
          {props.tooltipContent}
          {/*  fill={theme.colors["border"]}s */}
          <Tooltip.Arrow asChild width={16} height={8} viewBox="0 0 16 8">
            <PopoverArrow
              arrowFill={theme.colors["border"]}
              arrowStroke="transparent"
            />
          </Tooltip.Arrow>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
