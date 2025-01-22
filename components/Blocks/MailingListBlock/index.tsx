import { ButtonPrimary } from "components/Buttons";
import { InfoSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { Separator } from "components/Layout";
import { BlockProps } from "../Block";
import { MailComposer } from "./MailComposer";
import { SubscribeForm, SubscribePopover } from "./SubscribeForm";
import { useUIState } from "src/useUIState";
import { useSmoker } from "components/Toast";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { focusPage } from "components/Pages";
import {
  unsubscribe,
  useSubscriptionStatus,
} from "src/hooks/useSubscriptionStatus";

export const MailboxBlock = (props: BlockProps) => {
  let isSubscribed = useSubscriptionStatus(props.entityID);
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );

  let permission = useEntitySetContext().permissions.write;
  let smoke = useSmoker();

  let subscriber_count = useEntity(props.entityID, "mailbox/subscriber-count");
  if (!permission)
    return (
      <MailboxReaderView entityID={props.entityID} parent={props.parent} />
    );

  return (
    <div className={`mailboxContent relative w-full flex flex-col gap-1`}>
      <div
        className={`flex flex-col gap-2 items-center justify-center w-full
          ${isSelected ? "block-border-selected " : "block-border"} `}
        style={{
          backgroundColor:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
        }}
      >
        <div className="flex gap-2 p-4">
          <MailComposer entityID={props.entityID} />

          {/* <MailboxInfo /> */}
        </div>
      </div>
      <div className="flex gap-3 items-center justify-between">
        {
          <>
            {!isSubscribed?.confirmed ? (
              <SubscribePopover
                entityID={props.entityID}
                unconfirmed={!!isSubscribed && !isSubscribed.confirmed}
                parent={props.parent}
              />
            ) : (
              <button
                className="text-tertiary hover:text-accent-contrast"
                onClick={(e) => {
                  let rect = e.currentTarget.getBoundingClientRect();
                  unsubscribe(isSubscribed);
                  smoke({
                    text: "unsubscribed!",
                    position: { x: rect.left, y: rect.top - 8 },
                  });
                }}
              >
                Unsubscribe
              </button>
            )}
            <div className="flex gap-2 place-items-center">
              <span className="text-tertiary">
                {!subscriber_count ||
                subscriber_count?.data.value === undefined ||
                subscriber_count?.data.value === 0
                  ? "no"
                  : subscriber_count?.data.value}{" "}
                reader
                {subscriber_count?.data.value === 1 ? "" : "s"}
              </span>
              <Separator classname="h-5" />

              <GoToArchive entityID={props.entityID} parent={props.parent} />
            </div>
          </>
        }
      </div>
    </div>
  );
};

const MailboxReaderView = (props: { entityID: string; parent: string }) => {
  let isSubscribed = useSubscriptionStatus(props.entityID);
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  let archive = useEntity(props.entityID, "mailbox/archive");
  let smoke = useSmoker();
  let { rep } = useReplicache();
  return (
    <div className={`mailboxContent relative w-full flex flex-col gap-1 h-32`}>
      <div
        className={`h-full flex flex-col gap-2 items-center justify-center w-full rounded-md border outline ${
          isSelected
            ? "border-border outline-border"
            : "border-border-light outline-transparent"
        }`}
        style={{
          backgroundColor:
            "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
        }}
      >
        <div className="flex flex-col w-full gap-2 p-4">
          {!isSubscribed?.confirmed ? (
            <>
              <SubscribeForm
                entityID={props.entityID}
                role={"reader"}
                parent={props.parent}
              />
            </>
          ) : (
            <div className="flex flex-col gap-2 items-center place-self-center">
              <div className=" font-bold text-secondary ">
                You&apos;re Subscribed!
              </div>
              <div className="flex flex-col gap-1 items-center place-self-center">
                {archive ? (
                  <ButtonPrimary
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (rep) {
                        useUIState
                          .getState()
                          .openPage(props.parent, archive.data.value);
                        focusPage(archive.data.value, rep);
                      }
                    }}
                  >
                    See All Posts
                  </ButtonPrimary>
                ) : (
                  <div className="text-tertiary">
                    Nothing has been posted yet
                  </div>
                )}
                <button
                  className="text-accent-contrast hover:underline text-sm"
                  onClick={(e) => {
                    let rect = e.currentTarget.getBoundingClientRect();
                    unsubscribe(isSubscribed);
                    smoke({
                      text: "unsubscribed!",
                      position: { x: rect.left, y: rect.top - 8 },
                    });
                  }}
                >
                  unsubscribe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MailboxInfo = (props: { subscriber?: boolean }) => {
  return (
    <Popover
      className="max-w-xs"
      trigger={<InfoSmall className="shrink-0 text-accent-contrast" />}
    >
      <div className="text-sm text-secondary flex flex-col gap-2">
        {props.subscriber ? (
          <>
            <p className="font-bold">
              Get a notification whenever the creator posts to this mailbox!
            </p>
            <p>
              Your contact info will be kept private, and you can unsubscribe
              anytime.
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">
              When you post to this mailbox, subscribers will be notified!
            </p>
            <p>Reader contact info is kept private.</p>
            <p>You can have one draft post at a time.</p>
          </>
        )}
      </div>
    </Popover>
  );
};

export const GoToArchive = (props: {
  entityID: string;
  parent: string;
  small?: boolean;
}) => {
  let archive = useEntity(props.entityID, "mailbox/archive");
  let { rep } = useReplicache();

  return archive ? (
    <button
      className={`text-tertiary hover:text-accent-contrast  ${props.small && "text-sm"}`}
      onMouseDown={(e) => {
        e.preventDefault();
        if (rep) {
          useUIState.getState().openPage(props.parent, archive.data.value);
          focusPage(archive.data.value, rep);
        }
      }}
    >
      past posts
    </button>
  ) : (
    <div className={`text-tertiary text-center ${props.small && "text-sm"}`}>
      no posts yet
    </div>
  );
};
