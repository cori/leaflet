import { Database } from "supabase/database.types";
import { BlockProps, BaseBlock, ListMarker, Block } from "./Block";
import { useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";
import { createPhoneAuthToken } from "actions/phone_auth/request_phone_auth_token";
import { confirmPhoneAuthToken } from "actions/phone_auth/confirm_phone_auth_token";
import { useRSVPData } from "src/hooks/useRSVPData";
import { useEntitySetContext } from "components/EntitySetProvider";
import { ButtonPrimary, ButtonSecondary } from "components/Buttons";
import { UpdateSmall } from "components/Icons";
import { Popover } from "components/Popover";
import { create } from "zustand";
import { combine, createJSONStorage, persist } from "zustand/middleware";

type RSVP_Status = Database["public"]["Enums"]["rsvp_status"];
let Statuses = ["GOING", "NOT_GOING", "MAYBE"];
type State =
  | {
      state: "default";
    }
  | { state: "contact_details"; status: RSVP_Status };

export function RSVPBlock(props: BlockProps) {
  return (
    <div className="flex flex-col gap-2 border p-2 w-full rounded-lg border-accent-1">
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
  let rsvpStatus = data?.rsvps?.find(
    (rsvp) =>
      data.authToken &&
      rsvp.entity === props.entityID &&
      data.authToken.phone_number === rsvp.phone_number,
  )?.status;

  if (rsvpStatus)
    return (
      <>
        <div className="flex flex-row justify-between">
          <Attendees entityID={props.entityID} />
          <SendUpdateButton />
        </div>
        <hr />
        <div className="flex flex-row gap-2">
          {
            {
              GOING: `You're going!`,
              MAYBE: "Maybe Going",
              NOT_GOING: "You can't make it",
            }[rsvpStatus]
          }
          {" | "}
          {rsvpStatus !== "GOING" && (
            <ButtonSecondary onClick={() => updateStatus("GOING")}>
              Going
            </ButtonSecondary>
          )}
          {rsvpStatus !== "MAYBE" && (
            <ButtonSecondary onClick={() => updateStatus("MAYBE")}>
              Maybe
            </ButtonSecondary>
          )}
          {rsvpStatus !== "NOT_GOING" && (
            <button onClick={() => updateStatus("NOT_GOING")}>
              Can&apos;t Go
            </button>
          )}
        </div>
      </>
    );
  if (state.state === "default")
    return (
      <>
        <div className="flex flex-row justify-between">
          <div className="flex flex-row gap-2">
            <ButtonPrimary onClick={() => setStatus("GOING")}>
              Going!
            </ButtonPrimary>
            <ButtonSecondary onClick={() => setStatus("MAYBE")}>
              maybe
            </ButtonSecondary>
            <button onClick={() => setStatus("NOT_GOING")}>
              can&apos;t go
            </button>
          </div>
          <SendUpdateButton />
        </div>
        <hr />
        <Attendees entityID={props.entityID} />
      </>
    );
  if (state.state === "contact_details")
    return (
      <ContactDetailsForm
        status={state.status}
        setState={setState}
        entityID={props.entityID}
      />
    );
}

function Attendees(props: { entityID: string }) {
  let { data, mutate } = useRSVPData();
  let attendees =
    data?.rsvps.filter((rsvp) => rsvp.entity === props.entityID) || [];
  let going = attendees.filter((rsvp) => rsvp.status === "GOING");
  let maybe = attendees.filter((rsvp) => rsvp.status === "MAYBE");
  let notGoing = attendees.filter((rsvp) => rsvp.status === "NOT_GOING");

  console.log(attendees);
  return (
    <Popover
      trigger={
        <div>
          {going.length > 0 && `${going.length} going`}
          {maybe.length > 0 &&
            `${going.length > 0 ? ", " : ""}${maybe.length} maybe`}
          {notGoing.length > 0 &&
            `${going.length > 0 || maybe.length > 0 ? ", " : ""}${notGoing.length} can't go`}
        </div>
      }
    >
      {going.length > 0 && (
        <>
          <div className="font-bold">Going ({going.length})</div>
          {going.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </>
      )}
      {maybe.length > 0 && (
        <>
          <div className="font-bold">Maybe ({maybe.length})</div>
          {maybe.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </>
      )}
      {notGoing.length > 0 && (
        <>
          <div className="font-bold">Can&apos;t Go ({notGoing.length})</div>
          {notGoing.map((rsvp) => (
            <div key={rsvp.phone_number}>{rsvp.name}</div>
          ))}
        </>
      )}
    </Popover>
  );
}

function SendUpdateButton() {
  return (
    <ButtonPrimary>
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
    <div className="flex flex-row gap-2">
      <input
        placeholder="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="phone"
        disabled={!!data?.authToken.phone_number}
        value={data?.authToken.phone_number || formState.phone}
        onChange={(e) =>
          setFormState((state) => ({ ...state, phone: e.target.value }))
        }
      />
      <button
        onClick={async () => {
          if (data?.authToken) {
            submit(data.authToken);
          } else {
            let tokenId = await createPhoneAuthToken(formState.phone);
            setState({ state: "confirm", token: tokenId });
          }
        }}
      >
        submit
      </button>
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
