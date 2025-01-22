import { ButtonPrimary } from "components/Buttons";
import { PaintSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { useToaster } from "components/Toast";
import { useEntity, useReplicache } from "src/replicache";
import { useEntitySetContext } from "components/EntitySetProvider";
import { Page } from "components/Pages";
import { v7 } from "uuid";
import { sendPostToSubscribers } from "actions/subscriptions/sendPostToSubscribers";
import { getBlocksWithType } from "src/hooks/queries/useBlocks";
import { getBlocksAsHTML } from "src/utils/getBlocksAsHTML";
import { htmlToMarkdown } from "src/htmlMarkdownParsers";
import * as Dialog from "@radix-ui/react-dialog";
import { usePageTitle } from "components/utils/UpdateLeafletTitle";
import { CardThemeProvider } from "components/ThemeManager/ThemeProvider";
import { PageThemeSetter } from "components/ThemeManager/PageThemeSetter";

export const MailComposer = (props: { entityID: string }) => {
  let draft = useEntity(props.entityID, "mailbox/draft");
  let entity_set = useEntitySetContext();
  let { rep } = useReplicache();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <ButtonPrimary
          onClick={async () => {
            let entity;
            if (draft) {
              entity = draft.data.value;
            } else {
              entity = v7();
              await rep?.mutate.createDraft({
                mailboxEntity: props.entityID,
                permission_set: entity_set.set,
                newEntity: entity,
                firstBlockEntity: v7(),
                firstBlockFactID: v7(),
              });
            }
            // useUIState.getState().openPage(props.parent, entity);
            // if (rep) focusPage(entity, rep, "focusFirstBlock");
            // return;
          }}
        >
          {draft ? "Edit Draft" : "Write a Post"}
        </ButtonPrimary>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 bg-primary data-[state=open]:animate-overlayShow z-10" />
        {draft && (
          <Dialog.Content
            onClick={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
            className="modalWrapper fixed left-1/2 top-1/2 h-screen w-full max-w-3xl  -translate-x-1/2 -translate-y-1/2  sm:py-4 p-2 focus:outline-none data-[state=open]:animate-contentShow z-20"
          >
            <div className="modalContent h-full w-full flex items-stretch sm:py-3 p-2 rounded-lg bg-bg-leaflet">
              <div className="flex flex-col gap-3 mx-auto max-w-prose w-full h-full">
                <div>
                  <Dialog.Title className="text-lg text-secondary">
                    Write a Post
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-tertiary">
                    Email subscribers will get this in thier inbox, text
                    subscribers will get a link to this page. <br /> Your draft
                    saves automatically!
                  </Dialog.Description>
                </div>
                <div className="relative h-full overflow-y-scroll">
                  <CardThemeProvider entityID={draft?.data.value}>
                    <Page entityID={draft?.data.value} contained />
                  </CardThemeProvider>
                </div>
                <div className="flex justify-between items-center">
                  <Popover
                    className="!p-0 !pt-1"
                    trigger={
                      <PaintSmall className="text-primary hover:text-accent-contrast" />
                    }
                  >
                    <PageThemeSetter entityID={draft?.data.value} />
                  </Popover>
                  <ButtonPrimary>Send to 12 People</ButtonPrimary>
                </div>
              </div>
            </div>
            <Dialog.Close />
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const DraftPostOptions = (props: { mailboxEntity: string }) => {
  let toaster = useToaster();
  let draft = useEntity(props.mailboxEntity, "mailbox/draft");
  let { rep, permission_token } = useReplicache();
  let entity_set = useEntitySetContext();
  let archive = useEntity(props.mailboxEntity, "mailbox/archive");
  let pagetitle = usePageTitle(permission_token.root_entity);
  let subscriber_count = useEntity(
    props.mailboxEntity,
    "mailbox/subscriber-count",
  );
  if (!draft) return null;

  // once the send button is clicked, close the page and show a toast.
  return (
    <div className="flex justify-between items-center text-sm">
      <div className="flex gap-2">
        <em>Draft</em>
      </div>
      <button
        className="font-bold text-accent-2 bg-accent-1 border  hover:bg-accent-2 hover:text-accent-1 rounded-md px-2"
        onClick={async () => {
          if (!rep) return;
          let blocks =
            (await rep?.query((tx) =>
              getBlocksWithType(tx, draft.data.value),
            )) || [];
          let html = (await getBlocksAsHTML(rep, blocks))?.join("\n");
          await sendPostToSubscribers({
            title: pagetitle,
            permission_token,
            mailboxEntity: props.mailboxEntity,
            messageEntity: draft.data.value,
            contents: {
              html,
              markdown: htmlToMarkdown(html),
            },
          });

          rep?.mutate.archiveDraft({
            entity_set: entity_set.set,
            mailboxEntity: props.mailboxEntity,
            newBlockEntity: v7(),
            archiveEntity: v7(),
          });

          toaster({
            content: <div className="font-bold">Sent Post to Readers!</div>,
            type: "success",
          });
        }}
      >
        Send
        {!subscriber_count ||
          (subscriber_count.data.value !== 0 &&
            ` to ${subscriber_count.data.value} Reader${subscriber_count.data.value === 1 ? "" : "s"}`)}
        !
      </button>
    </div>
  );
};
