import { Database } from "supabase/database.types";
import { BlockProps, BaseBlock, ListMarker, Block } from "./Block";
import { useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";
import { createPhoneAuthToken } from "actions/phone_auth/request_phone_auth_token";
import { confirmPhoneAuthToken } from "actions/phone_auth/confirm_phone_auth_token";
import { useRSVPData } from "src/hooks/useRSVPData";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { InfoSmall, UpdateSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";
import { useUIState } from "src/useUIState";
import { Separator } from "components/Layout";
import { theme } from "tailwind.config";
import { useSmoker } from "components/Toast";

type RSVP_Status = Database["public"]["Enums"]["rsvp_status"];
let Statuses = ["GOING", "NOT_GOING", "MAYBE"];
type State =
  | {
      state: "default";
    }
  | { state: "contact_details"; status: RSVP_Status };

export function RSVPBlock(props: BlockProps) {
  let isSelected = useUIState((s) =>
    s.selectedBlocks.find((b) => b.value === props.entityID),
  );
  return (
    <div
      className={`rsvp flex flex-col sm:gap-2 border bg-test p-3 w-full rounded-lg ${isSelected ? "block-border-selected " : "block-border"}`}
      style={{
        backgroundColor:
          "color-mix(in oklab, rgb(var(--accent-contrast)), rgb(var(--bg-page)) 85%)",
      }}
    >
      <RSVPForm entityID={props.entityID} />
    </div>
  );
}

function RSVPForm(props: { entityID: string }) {
  let [state, setState] = useState<State>({ state: "default" });
  let { permissions } = useEntitySetContext();
  let { data, mutate } = useRSVPData();
  let setStatus = (status: RSVP_Status) => {
    setState({ status, state: "contact_details" });
  };
  let { name } = useRSVPNameState();

  let rsvpStatus = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.phone_number === rsvp.phone_number,
  )?.status;

  // IF YOU HAVE ALREADY RSVP'D
  if (rsvpStatus)
    return permissions.write ? (
      //AND YOU'RE A HOST
      <>
        <div className="flex sm:flex-row flex-col-reverse sm:gap-0 gap-2 justify-between items-start sm:items-center">
          <Attendees entityID={props.entityID} className="font-bold" />
          <hr className="block border-border sm:hidden w-full my-1" />

          <SendUpdateButton />
        </div>
        <hr className="border-border w-full hidden sm:block" />
        <YourRSVPStatus entityID={props.entityID} compact />
      </>
    ) : (
      // AND YOU'RE A GUEST
      <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center">
        <YourRSVPStatus entityID={props.entityID} />
        <hr className="block border-border sm:hidden w-full my-2" />
        <Attendees entityID={props.entityID} className="font-normal text-sm" />
      </div>
    );

  // IF YOU HAVEN'T RSVP'D
  if (state.state === "default")
    return permissions.write ? (
      //YOU'RE A HOST
      <>
        <div className="flex sm:flex-row flex-col-reverse sm:gap-0 gap-2 justify-between">
          <div className="flex flex-row gap-2 items-center">
            <ButtonPrimary onClick={() => setStatus("GOING")}>
              Going!
            </ButtonPrimary>
            <ButtonSecondary onClick={() => setStatus("MAYBE")}>
              Maybe
            </ButtonSecondary>
            <ButtonTertiary onClick={() => setStatus("NOT_GOING")}>
              Can&apos;t Go
            </ButtonTertiary>
          </div>
          <hr className="block border-border sm:hidden w-full my-1" />

          <SendUpdateButton />
        </div>
        <hr className="border-border sm:block hidden" />
        <Attendees entityID={props.entityID} className="text-sm sm:pt-0 pt-2" />
      </>
    ) : (
      //YOU'RE A GUEST
      <div className="flex sm:flex-row flex-col justify-between">
        <div className="flex flex-row gap-2 items-center">
          <ButtonPrimary onClick={() => setStatus("GOING")}>
            Going!
          </ButtonPrimary>
          <ButtonSecondary onClick={() => setStatus("MAYBE")}>
            Maybe
          </ButtonSecondary>
          <ButtonTertiary onClick={() => setStatus("NOT_GOING")}>
            Can&apos;t Go
          </ButtonTertiary>
        </div>
        <hr className="block border-border sm:hidden w-full my-2" />

        <Attendees entityID={props.entityID} className="text-sm" />
      </div>
    );

  // IF YOU ARE CURRENTLY CONFIRMING YOUR CONTACT DETAILS
  if (state.state === "contact_details")
    return (
      <ContactDetailsForm
        status={state.status}
        setState={setState}
        entityID={props.entityID}
      />
    );
}

function YourRSVPStatus(props: { entityID: string; compact?: boolean }) {
  let { data, mutate } = useRSVPData();
  let { name } = useRSVPNameState();

  let rsvpStatus = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.phone_number === rsvp.phone_number,
  )?.status;

  let updateStatus = async (status: RSVP_Status) => {
    if (!data?.authToken) return;
    await submitRSVP({
      status,
      name: name,
      entity: props.entityID,
    });

    mutate({
      authToken: data.authToken,
      rsvps: [
        ...(data?.rsvps || []).filter((r) => r.entity !== props.entityID),
        {
          name: name,
          status,
          entity: props.entityID,
          phone_number: data.authToken.phone_number,
        },
      ],
    });
  };
  return (
    <div
      className={`flex flex-row gap-1 sm:gap-2 font-bold items-center ${props.compact ? "text-sm sm:font-bold font-normal" : ""}`}
    >
      {rsvpStatus !== undefined &&
        {
          GOING: `You're Going!`,
          MAYBE: "You're a Maybe",
          NOT_GOING: "Can't Make It",
        }[rsvpStatus]}
      <Separator classname="mx-1 h-6" />
      {rsvpStatus !== "GOING" && (
        <ButtonPrimary
          className={props.compact ? "text-sm  !font-normal" : ""}
          compact={props.compact}
          onClick={() => updateStatus("GOING")}
        >
          Going
        </ButtonPrimary>
      )}
      {rsvpStatus !== "MAYBE" && (
        <ButtonSecondary
          className={props.compact ? "text-sm  !font-normal" : ""}
          compact={props.compact}
          onClick={() => updateStatus("MAYBE")}
        >
          Maybe
        </ButtonSecondary>
      )}
      {rsvpStatus !== "NOT_GOING" && (
        <ButtonTertiary
          className={props.compact ? "text-sm  !font-normal" : ""}
          onClick={() => updateStatus("NOT_GOING")}
        >
          Can&apos;t Go
        </ButtonTertiary>
      )}
    </div>
  );
}

function Attendees(props: { entityID: string; className?: string }) {
  let { data, mutate } = useRSVPData();
  let attendees =
    data?.rsvps.filter((rsvp) => rsvp.entity === props.entityID) || [];
  let going = attendees.filter((rsvp) => rsvp.status === "GOING");
  let maybe = attendees.filter((rsvp) => rsvp.status === "MAYBE");
  let notGoing = attendees.filter((rsvp) => rsvp.status === "NOT_GOING");

  return (
    <Popover
      align="start"
      className="text-sm text-secondary flex flex-col gap-2 max-w-sm"
      asChild
      trigger={
        going.length === 0 && maybe.length === 0 ? (
          <button
            className={`w-max text-tertiary italic hover:underline ${props.className}`}
          >
            No RSVPs yet
          </button>
        ) : (
          <ButtonTertiary className={props.className}>
            {going.length > 0 && `${going.length} Going`}
            {maybe.length > 0 &&
              `${going.length > 0 ? ", " : ""}${maybe.length} Maybe`}
          </ButtonTertiary>
        )
      }
    >
      {going.length === 0 && maybe.length === 0 && notGoing.length === 0 && (
        <div className="text-tertiary italic">No RSVPs yet</div>
      )}
      {going.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <div className="font-bold text-tertiary">Going ({going.length})</div>
          {going.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </div>
      )}
      {maybe.length > 0 && (
        <div className="flex flex-col gap-0">
          <div className="font-bold text-tertiary">Maybe ({maybe.length})</div>
          {maybe.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </div>
      )}
      {notGoing.length > 0 && (
        <div className="flex flex-col gap-0">
          <div className="font-bold text-tertiary">
            Can&apos;t Go ({notGoing.length})
          </div>
          {notGoing.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </div>
      )}
    </Popover>
  );
}

function SendUpdateButton() {
  let { permissions } = useEntitySetContext();
  let [input, setInput] = useState("");

  if (!!!permissions.write) return;
  return (
    <Popover
      asChild
      trigger={
        <ButtonPrimary fullWidthOnMobile>
          <UpdateSmall /> Send an Update
        </ButtonPrimary>
      }
    >
      <div className="rsvpMessageComposer flex flex-col gap-2 w-auto max-w-md">
        <label className="flex flex-col font-bold text-secondary">
          <p>Send a Text Blast</p>
          <small className="font-normal text-secondary">
            Write and send a short message as a text message to everyone who is{" "}
            <b>Going</b> or a <b>Maybe</b>.
          </small>

          <textarea
            id="rsvp-message-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            className="input-with-border w-full h-[150px] mt-1 pt-0.5 font-normal text-primary"
          />
        </label>
        <div className="flex justify-between items-start">
          <div
            className={`rsvpMessageCharCounter text-sm text-tertiary`}
            style={
              input.length > 300
                ? {
                    color: theme.colors["accent-contrast"],
                    fontWeight: "bold",
                  }
                : {
                    color: theme.colors["tertiary"],
                  }
            }
          >
            {input.length}/300 {input.length > 300 && " (too long!)"}
          </div>
          <ButtonPrimary
            disabled={input.length > 300}
            className="place-self-end "
          >
            Send
          </ButtonPrimary>
        </div>
      </div>
    </Popover>
  );
}

let useRSVPNameState = create(
  persist(
    combine({ name: "" }, (set) => ({
      setName: (name: string) => set({ name }),
    })),
    {
      name: "rsvp-name",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

function ContactDetailsForm({
  status,
  entityID,
}: {
  status: RSVP_Status;
  entityID: string;
  setState: (s: State) => void;
}) {
  let smoker = useSmoker();

  let { data, mutate } = useRSVPData();
  let [state, setState] = useState<
    { state: "details" } | { state: "confirm"; token: string }
  >({ state: "details" });
  let { name, setName } = useRSVPNameState();
  const [formState, setFormState] = useState({
    phone: "",
    confirmationCode: "",
  });

  let submit = async (
    token: Awaited<ReturnType<typeof confirmPhoneAuthToken>>,
  ) => {
    try {
      await submitRSVP({
        status,
        name: name,
        entity: entityID,
      });
    } catch (e) {
      //handle failed confirm
      return false;
    }

    mutate({
      authToken: token,
      rsvps: [
        ...(data?.rsvps || []).filter((r) => r.entity !== entityID),
        {
          name: name,
          status,
          entity: entityID,
          phone_number: token.phone_number,
        },
      ],
    });
    return true;
  };
  return state.state === "details" ? (
    <div className="rsvpForm flex flex-col gap-2">
      <div className="rsvpInputs flex sm:flex-row flex-col gap-2 w-fit place-self-center ">
        <div className="rsvpNameInput relative w-full basis-1/3">
          <label className="absolute top-0.5 left-[6px] text-xs font-bold italic text-tertiary">
            name
          </label>
          <input
            placeholder="..."
            className="input-with-border !pt-5 w-full "
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div
          className={`rsvpPhoneInputWrapper  relative flex flex-col gap-0.5 w-full basis-2/3`}
        >
          <div
            className={`rsvpPhoneInput input-with-border flex flex-col  ${!!data?.authToken.phone_number && "bg-border-light border-border-light text-tertiary"}`}
          >
            <label className=" text-xs font-bold italic text-tertiary">
              phone number
            </label>
            <div className="flex gap-2 ">
              <div className="w-max shrink-0">🇺🇸 +1</div>
              <Separator />

              <input
                placeholder="0000000000"
                className="bg-transparent disabled:text-tertiary w-full"
                disabled={!!data?.authToken.phone_number}
                value={data?.authToken.phone_number || formState.phone}
                onChange={(e) =>
                  setFormState((state) => ({ ...state, phone: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="text-xs italic text-tertiary leading-tight">
            Non-US numbers will receive messages through{" "}
            <strong>WhatsApp</strong>
          </div>
        </div>
      </div>

      <hr className="border-border" />
      <div className="flex flex-row gap-2 w-full items-center justify-end">
        <ConsentPopover />
        <ButtonPrimary
          className="place-self-end"
          onClick={async () => {
            if (data?.authToken) {
              submit(data.authToken);
            } else {
              let tokenId = await createPhoneAuthToken(formState.phone);
              setState({ state: "confirm", token: tokenId });
            }
          }}
        >
          RSVP as {status === "GOING" ? "Going" : "Maybe"}
        </ButtonPrimary>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <div className="rsvpNameInput relative w-full flex flex-col gap-0.5">
        <label className="absolute top-0.5 left-[6px] text-xs font-bold italic text-tertiary">
          confirmation code
        </label>
        <input
          placeholder="000000"
          className="input-with-border !pt-5 w-full "
          value={formState.confirmationCode || ""}
          onChange={(e) =>
            setFormState((state) => ({
              ...state,
              confirmationCode: e.target.value,
            }))
          }
        />
        <div className="text-xs italic text-tertiary leading-tight">
          we texted a confirmation code to your phone number!
        </div>
      </div>
      <hr className="border-border" />

      <ButtonPrimary
        className="place-self-end"
        onMouseDown={async (e) => {
          try {
            let token = await confirmPhoneAuthToken(
              state.token,
              formState.confirmationCode,
            );
            submit(token);
          } catch (error) {
            smoker({
              alignOnMobile: "left",
              error: true,
              text: "invalid code!",
              position: { x: e.clientX, y: e.clientY },
            });
            return;
          }
        }}
      >
        Confirm
      </ButtonPrimary>
    </div>
  );
}

const ConsentPopover = () => {
  return (
    <Popover
      className="max-w-xs text-sm text-secondary"
      trigger={<InfoSmall className="text-accent-contrast" />}
    >
      Clicking this button means that you are consenting to receive SMS messages
      from us!
    </Popover>
  );
};
