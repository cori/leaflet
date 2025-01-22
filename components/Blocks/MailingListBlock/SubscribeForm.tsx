import { ButtonPrimary } from "components/Buttons";
import { ArrowDownTiny } from "components/Icons";
import { Popover } from "components/Popover";
import { Menu, MenuItem } from "components/Layout";
import { GoToArchive } from ".";
import { useState } from "react";
import { useSmoker } from "components/Toast";
import { useReplicache } from "src/replicache";
import { subscribeToMailboxWithEmail } from "actions/subscriptions/subscribeToMailboxWithEmail";
import { confirmEmailSubscription } from "actions/subscriptions/confirmEmailSubscription";
import {
  addSubscription,
  removeSubscription,
  useSubscriptionStatus,
} from "src/hooks/useSubscriptionStatus";

export const SubscribePopover = (props: {
  entityID: string;
  parent: string;
  unconfirmed: boolean;
}) => {
  return (
    <Popover
      className="max-w-sm"
      trigger={
        <div className="font-bold text-accent-contrast">
          {props.unconfirmed ? "Confirm" : "Subscribe"}
        </div>
      }
    >
      <div className="text-secondary flex flex-col gap-2 py-1">
        <SubscribeForm
          compact
          entityID={props.entityID}
          role="author"
          parent={props.parent}
        />
      </div>
    </Popover>
  );
};

export const SubscribeForm = (props: {
  entityID: string;
  parent: string;
  role: "author" | "reader";
  compact?: boolean;
}) => {
  let smoke = useSmoker();
  let [channel, setChannel] = useState<"email" | "sms">("email");
  let [email, setEmail] = useState("");
  let [sms, setSMS] = useState("");

  let subscription = useSubscriptionStatus(props.entityID);
  let [code, setCode] = useState("");
  let { permission_token } = useReplicache();
  if (subscription && !subscription.confirmed) {
    return (
      <div className="flex flex-col gap-3 justify-center text-center ">
        <div className="font-bold text-secondary  ">
          Enter the code we sent to{" "}
          <code
            className="italic"
            style={{ fontFamily: "var(--font-quattro)" }}
          >
            {subscription.email}
          </code>{" "}
          here!
        </div>
        <div className="flex flex-col gap-1">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              let result = await confirmEmailSubscription(
                subscription.id,
                code,
              );

              let rect = document
                .getElementById("confirm-code-button")
                ?.getBoundingClientRect();

              if (!result) {
                smoke({
                  error: true,
                  text: "oops, incorrect code",
                  position: {
                    x: rect ? rect.left + 45 : 0,
                    y: rect ? rect.top + 15 : 0,
                  },
                });
                return;
              }
              addSubscription(result.subscription);
            }}
            className="mailboxConfirmCodeInput flex gap-2 items-center mx-auto"
          >
            <input
              type="number"
              value={code}
              className="appearance-none focus:outline-none focus:border-border w-20 border border-border-light bg-bg-page rounded-md p-1"
              onChange={(e) => setCode(e.currentTarget.value)}
            />

            <ButtonPrimary type="submit" id="confirm-code-button">
              Confirm!
            </ButtonPrimary>
          </form>

          <button
            onMouseDown={() => {
              removeSubscription(subscription);
              setEmail("");
            }}
            className="text-accent-contrast hover:underline text-sm"
          >
            use another contact
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-1">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            let subscriptionID = await subscribeToMailboxWithEmail(
              props.entityID,
              email,
              permission_token,
            );
            if (subscriptionID) addSubscription(subscriptionID);
          }}
          className={`mailboxSubscribeForm flex sm:flex-row flex-col ${props.compact && "sm:flex-col sm:gap-2"} gap-2 sm:gap-3 items-center place-self-center mx-auto`}
        >
          <div className="mailboxChannelInput flex gap-2 border border-border-light bg-bg-page rounded-md py-1 px-2 grow max-w-72 ">
            <input
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full appearance-none focus:outline-none bg-transparent"
              placeholder="youremail@email.com"
            />
          </div>
          <ButtonPrimary type="submit">Subscribe!</ButtonPrimary>
        </form>
        {props.role === "reader" && (
          <GoToArchive entityID={props.entityID} parent={props.parent} small />
        )}
      </div>
    </>
  );
};

const ChannelSelector = (props: {
  channel: "email" | "sms";
  setChannel: (channel: "email" | "sms") => void;
}) => {
  return (
    <Menu
      className="w-20"
      trigger={
        <div className="flex gap-2 w-16 items-center justify-between text-secondary">
          {props.channel === "email" ? "Email" : "SMS"}{" "}
          <ArrowDownTiny className="shrink-0 text-accent-contrast" />
        </div>
      }
    >
      <MenuItem
        className="font-normal"
        onSelect={() => {
          props.setChannel("email");
        }}
      >
        Email
      </MenuItem>
      <MenuItem
        className="font-normal"
        onSelect={() => {
          props.setChannel("sms");
        }}
      >
        SMS
      </MenuItem>
    </Menu>
  );
};
