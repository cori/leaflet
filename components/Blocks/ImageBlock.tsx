"use client";

import { useEntity, useReplicache } from "src/replicache";
import { Block, BlockProps } from "./Block";
import { useUIState } from "src/useUIState";
import { BlockImageSmall } from "components/Icons";
import { v7 } from "uuid";
import { useEntitySetContext } from "components/EntitySetProvider";
import { generateKeyBetween } from "fractional-indexing";
import { addImage } from "src/utils/addImage";
import { elementId } from "src/utils/elementId";
import { useEffect } from "react";
import { deleteBlock } from "./DeleteBlock";

export function ImageBlock(props: BlockProps) {
  let { rep } = useReplicache();
  let image = useEntity(props.value, "block/image");
  let entity_set = useEntitySetContext();
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.value),
  );
  useEffect(() => {
    let input = document.getElementById(elementId.block(props.entityID).input);
    if (isSelected) {
      input?.focus();
    } else {
      input?.blur();
    }
  }, [isSelected]);

  if (!image) {
    return (
      <div className="grow w-full">
        <label
          id={elementId.block(props.entityID).input}
          className={`group/image-block w-full h-[104px] text-tertiary hover:text-accent-contrast hover:font-bold hover:cursor-pointer flex flex-auto gap-2 items-center justify-center p-2 ${isSelected ? "border-2 border-tertiary font-bold" : "border border-border"} hover:border-2 border-dashed  hover:border-accent-contrast rounded-lg`}
          onMouseDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              rep && deleteBlock([props.entityID].flat(), rep);
            }
          }}
        >
          <BlockImageSmall
            className={`shrink-0 group-hover/image-block:text-accent-contrast ${isSelected ? "text-tertiary" : "text-border"}`}
          />{" "}
          Upload An Image
          <input
            className="h-0 w-0"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              let file = e.currentTarget.files?.[0];
              if (!file || !rep) return;
              let entity = props.entityID;
              if (!entity) {
                entity = v7();
                await rep?.mutate.addBlock({
                  parent: props.parent,
                  factID: v7(),
                  permission_set: entity_set.set,
                  type: "text",
                  position: generateKeyBetween(
                    props.position,
                    props.nextPosition,
                  ),
                  newEntityID: entity,
                });
              }
              await rep.mutate.assertFact({
                entity,
                attribute: "block/type",
                data: { type: "block-type-union", value: "image" },
              });
              await addImage(file, rep, {
                entityID: entity,
                attribute: "block/image",
              });
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="relative group/image flex w-full justify-center">
      <img
        alt={""}
        src={
          image?.data.local && image.data.local !== rep?.clientID
            ? image?.data.fallback
            : image?.data.src
        }
        height={image?.data.height}
        width={image?.data.width}
        className={`
          outline outline-1 border rounded-lg
          ${isSelected ? "border-tertiary outline-tertiary" : "border-transparent  outline-transparent"}`}
      />
    </div>
  );
}
