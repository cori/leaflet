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
    console.log(name);
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

  console.log(attendees);
  return (
    <Popover
      align="start"
      className="text-sm text-secondary flex flex-col gap-2 max-w-sm"
      trigger={
        going.length === 0 && maybe.length === 0 ? (
          <div
            className={`w-max text-tertiary italic hover:underline ${props.className}`}
          >
            No RSVPs yet
          </div>
        ) : (
          <div
            className={` font-bold hover:underline w-max text-accent-contrast !text-left place-self-start ${props.className}`}
          >
            {going.length > 0 && `${going.length} Going`}
            {maybe.length > 0 &&
              `${going.length > 0 ? ", " : ""}${maybe.length} Maybe`}
          </div>
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
  if (!!!permissions.write) return;
  return (
    <ButtonPrimary fullWidthOnMobile>
      <UpdateSmall /> Send an Update
    </ButtonPrimary>
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
    await submitRSVP({
      status,
      name: name,
      entity: entityID,
    });

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
          RSVP
        </ButtonPrimary>
      </div>
    </div>
  ) : (
    <div className="flex flex-row gap-2">
      <input
        placeholder="confirmation code"
        value={formState.confirmationCode || ""}
        onChange={(e) =>
          setFormState((state) => ({
            ...state,
            confirmationCode: e.target.value,
          }))
        }
      />
      <button
        onClick={async () => {
          let token = await confirmPhoneAuthToken(
            state.token,
            formState.confirmationCode,
          );
          submit(token);
        }}
      >
        confirm
      </button>
    </div>
  );
}

const ConsentPopover = () => {
  return (
    <Popover
      className="max-w-xs text-sm"
      trigger={<InfoSmall className="text-accent-contrast" />}
    >
      Clicking this button means that you are consenting to receive SMS messages
      from us!
    </Popover>
  );
};
