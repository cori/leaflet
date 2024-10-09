import { useReplicache } from "src/replicache";
import { ShareSmall } from "components/Icons";
import { useEffect, useState } from "react";
import { getShareLink } from "./getShareLink";
import { useEntitySetContext } from "components/EntitySetProvider";
import { useSmoker } from "components/Toast";
import { Menu, MenuItem } from "components/Layout";
import { HoverButton } from "components/Buttons";
import useSWR from "swr";

export let usePublishLink = () => {
  let { permission_token, rootEntity } = useReplicache();
  let entity_set = useEntitySetContext();
  let { data: publishLink } = useSWR(
    "publishLink-" + permission_token.id,
    async () => {
      if (
        !permission_token.permission_token_rights.find(
          (s) => s.entity_set === entity_set.set && s.create_token,
        )
      )
        return;
      let shareLink = await getShareLink(
        { id: permission_token.id, entity_set: entity_set.set },
        rootEntity,
      );
      return shareLink?.id;
    },
  );
  return publishLink;
};
export function ShareOptions(props: { rootEntity: string }) {
  let { permission_token } = useReplicache();
  let entity_set = useEntitySetContext();
  let publishLink = usePublishLink();
  let [collabLink, setCollabLink] = useState<null | string>(null);
  useEffect(() => {
    setCollabLink(window.location.pathname);
  }, []);

  let smoker = useSmoker();

  if (
    !permission_token.permission_token_rights.find(
      (s) => s.entity_set === entity_set.set && s.create_token,
    )
  )
    return null;

  return (
    <Menu
      trigger={
        <HoverButton
          icon=<ShareSmall />
          label="Share"
          background="bg-accent-1"
          text="text-accent-2"
        />
      }
    >
      <ShareButton
        text="Publish"
        subtext="Share a read-only version"
        smokerText="Publish link copied!"
        id="get-publish-link"
        link={publishLink || ""}
      />
      <ShareButton
        text="Collaborate"
        subtext="Invite people to edit together"
        smokerText="Collab link copied!"
        id="get-collab-link"
        link={collabLink}
      />
    </Menu>
  );
}

export const ShareButton = (props: {
  text: string;
  subtext: string;
  helptext?: string;
  smokerText: string;
  id: string;
  link: null | string;
}) => {
  let smoker = useSmoker();

  return (
    <MenuItem
      id={props.id}
      onSelect={(e) => {
        e.preventDefault();
        let rect = document.getElementById(props.id)?.getBoundingClientRect();
        if (props.link) {
          navigator.clipboard.writeText(
            `${location.protocol}//${location.host}/${props.link}`,
          );
          smoker({
            position: {
              x: rect ? rect.left + 80 : 0,
              y: rect ? rect.top + 26 : 0,
            },
            text: props.smokerText,
          });
        }
      }}
    >
      <div className={`group/${props.id}`}>
        <div className={`group-hover/${props.id}:text-accent-contrast`}>
          {props.text}
        </div>
        <div
          className={`text-sm font-normal text-tertiary group-hover/${props.id}:text-accent-contrast`}
        >
          {props.subtext}
        </div>
        {/* optional help text */}
        {props.helptext && (
          <div
            className={`text-sm italic font-normal text-tertiary group-hover/${props.id}:text-accent-contrast`}
          >
            {props.helptext}
          </div>
        )}
      </div>
    </MenuItem>
  );
};
