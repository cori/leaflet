"use client";
import { Database } from "supabase/database.types";
import { BlockProps } from "components/Blocks/Block";
import { createContext, useContext, useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";
import { useRSVPData } from "src/hooks/useRSVPData";
import { useEntitySetContext } from "components/EntitySetProvider";
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonTertiary,
} from "components/Buttons";
import { UpdateSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";
import { useUIState } from "src/useUIState";
import { theme } from "tailwind.config";
import { useToaster } from "components/Toast";
import { sendUpdateToRSVPS } from "actions/sendUpdateToRSVPS";
import { useReplicache } from "src/replicache";
import { ContactDetailsForm } from "./ContactDetailsForm";
import { Checkbox } from "components/Checkbox";
import styles from "./RSVPBackground.module.css";
import { usePublishLink } from "components/ShareOptions";

export type RSVP_Status = Database["public"]["Enums"]["rsvp_status"];
let Statuses = ["GOING", "NOT_GOING", "MAYBE"];
export type State =
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
      className={`rsvp relative flex flex-col gap-1 border  p-3 w-full rounded-lg  place-items-center justify-center ${isSelected ? "block-border-selected " : "block-border"}`}
      style={{
        backgroundColor:
          "color-mix(in oklab, rgb(var(--accent-1)), rgb(var(--bg-page)) 85%)",
      }}
    >
      <RSVPForm entityID={props.entityID} />
    </div>
  );
}

const RSVPBackground = () => {
  return (
    <div className="overflow-hidden absolute top-0 bottom-0 left-0 right-0 ">
      <div
        className={`rsvp-background w-full h-full bg-accent-1 z-0 ${styles.RSVPWavyBG} `}
      />
    </div>
  );
};

function RSVPForm(props: { entityID: string }) {
  let [state, setState] = useState<State>({ state: "default" });
  let { permissions } = useEntitySetContext();
  let { data, mutate } = useRSVPData();
  let setStatus = (status: RSVP_Status) => {
    setState({ status, state: "contact_details" });
  };
  let [editing, setEditting] = useState(false);

  let rsvpStatus = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.country_code === rsvp.country_code &&
      data.authToken.phone_number === rsvp.phone_number,
  )?.status;

  // IF YOU HAVE ALREADY RSVP'D
  if (rsvpStatus && !editing)
    return (
      <>
        {permissions.write && <SendUpdateButton entityID={props.entityID} />}

        <YourRSVPStatus
          entityID={props.entityID}
          setEditting={() => {
            setStatus(rsvpStatus);
            setEditting(true);
          }}
        />
        <Attendees entityID={props.entityID} />
      </>
    );

  // IF YOU HAVEN'T RSVP'D
  if (state.state === "default")
    return (
      <>
        {permissions.write && <SendUpdateButton entityID={props.entityID} />}
        <RSVPButtons setStatus={setStatus} />
        <Attendees entityID={props.entityID} className="" />
      </>
    );

  // IF YOU ARE CURRENTLY CONFIRMING YOUR CONTACT DETAILS
  if (state.state === "contact_details")
    return (
      <>
        <RSVPButtons setStatus={setStatus} />
        <ContactDetailsForm
          status={state.status}
          setState={(newState) => {
            if (newState.state === "default" && editing) setEditting(false);
            setState(newState);
          }}
          entityID={props.entityID}
        />
      </>
    );
}

const RSVPButtons = (props: { setStatus: (status: RSVP_Status) => void }) => {
  return (
    <div className="relative w-full sm:p-6  py-4 px-3 rounded-md border-[1.5px] border-accent-1">
      <RSVPBackground />
      <div className="relative flex flex-row gap-2 items-center mx-auto z-[1] w-fit">
        <ButtonSecondary className="" onClick={() => props.setStatus("MAYBE")}>
          Maybe
        </ButtonSecondary>
        <ButtonPrimary
          className="text-lg"
          onClick={() => props.setStatus("GOING")}
        >
          Going!
        </ButtonPrimary>

        <ButtonSecondary
          className=""
          onClick={() => props.setStatus("NOT_GOING")}
        >
          Can&apos;t Go
        </ButtonSecondary>
      </div>
    </div>
  );
};

function YourRSVPStatus(props: {
  entityID: string;
  compact?: boolean;
  setEditting: (e: boolean) => void;
}) {
  let { data, mutate } = useRSVPData();
  let { name } = useRSVPNameState();
  let toaster = useToaster();

  let existingRSVP = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.phone_number === rsvp.phone_number,
  );
  let rsvpStatus = existingRSVP?.status;

  let updateStatus = async (status: RSVP_Status) => {
    if (!data?.authToken) return;
    await submitRSVP({
      status,
      name: name,
      entity: props.entityID,
      plus_ones: existingRSVP?.plus_ones || 0,
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
          country_code: data.authToken.country_code,
          plus_ones: existingRSVP?.plus_ones || 0,
        },
      ],
    });
  };
  return (
    <div
      className={`relative w-full p-4 pb-5 rounded-md border-[1.5px] border-accent-1 font-bold items-center`}
    >
      <RSVPBackground />
      <div className=" relative flex flex-col gap-1 sm:gap-2 z-[1] justify-center">
        <div
          className="text-xl text-center text-accent-2 text-with-outline"
          style={{
            WebkitTextStroke: `3px ${theme.colors["accent-1"]}`,
            textShadow: `-4px 3px 0 ${theme.colors["accent-1"]}`,
            paintOrder: "stroke fill",
          }}
        >
          {rsvpStatus !== undefined &&
            {
              GOING: `You're Going!`,
              MAYBE: "You're a Maybe",
              NOT_GOING: "Can't Make It",
            }[rsvpStatus]}
          <button onClick={() => props.setEditting(true)}>edit?</button>
        </div>
      </div>
    </div>
  );
}

function Attendees(props: { entityID: string; className?: string }) {
  let { data } = useRSVPData();
  let attendees =
    data?.rsvps?.filter((rsvp) => rsvp.entity === props.entityID) || [];
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
            className={`text-sm font-normal w-max text-tertiary italic hover:underline ${props.className}`}
          >
            No RSVPs yet
          </button>
        ) : (
          <ButtonTertiary className={`text-sm font-normal ${props.className}`}>
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
      <AttendeeStatusList rsvps={going} title="Going" />
      <AttendeeStatusList rsvps={maybe} title="Maybe" />
      <AttendeeStatusList rsvps={notGoing} title="Can't Go" />
    </Popover>
  );
}

function AttendeeStatusList(props: {
  rsvps: Array<{
    name: string;
    phone_number?: string;
    plus_ones: number;
    status: string;
  }>;
  title: string;
}) {
  if (props.rsvps.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-bold text-tertiary">
        {props.title} ({props.rsvps.length})
      </div>
      {props.rsvps.map((rsvp) => (
        <div key={rsvp.phone_number}>
          {rsvp.name} {rsvp.plus_ones > 0 ? `+${rsvp.plus_ones}` : ""}
        </div>
      ))}
    </div>
  );
}

function SendUpdateButton(props: { entityID: string }) {
  let publishLink = usePublishLink();
  let { permissions } = useEntitySetContext();
  let { permission_token } = useReplicache();
  let [input, setInput] = useState("");
  let toaster = useToaster();
  let [open, setOpen] = useState(false);
  let [checkedRecipients, setCheckedRecipients] = useState({
    GOING: true,
    MAYBE: true,
    NOT_GOING: false,
  });

  let { data, mutate } = useRSVPData();
  let attendees =
    data?.rsvps?.filter((rsvp) => rsvp.entity === props.entityID) || [];
  let going = attendees.filter((rsvp) => rsvp.status === "GOING");
  let maybe = attendees.filter((rsvp) => rsvp.status === "MAYBE");
  let notGoing = attendees.filter((rsvp) => rsvp.status === "NOT_GOING");

  let allRecipients =
    ((checkedRecipients.GOING && going.length) || 0) +
    ((checkedRecipients.MAYBE && maybe.length) || 0) +
    ((checkedRecipients.NOT_GOING && notGoing.length) || 0);

  if (!!!permissions.write) return;
  return (
    <Popover
      asChild
      open={open}
      onOpenChange={(open) => setOpen(open)}
      trigger={
        <ButtonPrimary fullWidth className="mb-2">
          <UpdateSmall /> Send a Text Blast
        </ButtonPrimary>
      }
    >
      <div className="rsvpMessageComposer flex flex-col gap-2 w-[1000px] max-w-full sm:max-w-md">
        <div className="flex flex-col font-bold text-secondary">
          <h3>Send a Text Blast to</h3>
          <RecipientPicker
            checked={checkedRecipients}
            setChecked={setCheckedRecipients}
          />

          <textarea
            id="rsvp-message-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            className="input-with-border w-full h-[150px] mt-3 pt-0.5 font-normal text-primary"
          />
        </div>
        <div className="flex justify-between items-start">
          <div
            className={`rsvpMessageCharCounter text-sm text-tertiary`}
            style={
              input.length > 300
                ? {
                    color: theme.colors["accent-1"],
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
            onClick={async () => {
              if (!permission_token || !publishLink) return;
              await sendUpdateToRSVPS(permission_token, {
                entity: props.entityID,
                message: input,
                eventName: document.title,
                sendto: checkedRecipients,
                publicLeafletID: publishLink,
              });
              toaster({
                content: <div className="font-bold">Update sent!</div>,
                type: "success",
              });
              setOpen(false);
            }}
          >
            Text {allRecipients} {allRecipients === 1 ? "Person" : "People"}!
          </ButtonPrimary>
        </div>
      </div>
    </Popover>
  );
}

const RecipientPicker = (props: {
  checked: { GOING: boolean; MAYBE: boolean; NOT_GOING: boolean };
  setChecked: (checked: {
    GOING: boolean;
    MAYBE: boolean;
    NOT_GOING: boolean;
  }) => void;
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      {/* <small className="font-normal">
        Send a text to everyone who RSVP&apos;d:
      </small> */}
      <div className="flex gap-4 text-secondary">
        <Checkbox
          className="!w-fit"
          checked={props.checked.GOING}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              GOING: !props.checked.GOING,
            });
          }}
        >
          Going
        </Checkbox>
        <Checkbox
          className="!w-fit"
          checked={props.checked.MAYBE}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              MAYBE: !props.checked.MAYBE,
            });
          }}
        >
          Maybe
        </Checkbox>
        <Checkbox
          className="!w-fit"
          checked={props.checked.NOT_GOING}
          onChange={() => {
            props.setChecked({
              ...props.checked, // Spread the existing values
              NOT_GOING: !props.checked.NOT_GOING,
            });
          }}
        >
          Can&apos;t Go
        </Checkbox>
      </div>
    </div>
  );
};

export let useRSVPNameState = create(
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
