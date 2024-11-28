import { Database } from "supabase/database.types";
import { BlockProps, BaseBlock, ListMarker, Block } from "./Block";
import { useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";
import { createPhoneAuthToken } from "actions/phone_auth/request_phone_auth_token";
import { confirmPhoneAuthToken } from "actions/phone_auth/confirm_phone_auth_token";
import { useRSVPData } from "src/hooks/useRSVPData";
import { useEntitySetContext } from "components/EntitySetProvider";

type RSVP_Status = Database["public"]["Enums"]["rsvp_status"];
let Statuses = ["GOING", "NOT_GOING", "MAYBE"];
type State =
  | {
      state: "default";
    }
  | { state: "contact_details"; status: RSVP_Status };

export function RSVPBlock(props: BlockProps) {
  return (
    <div className="flex flex-col gap-2 border p-2 w-full">
      <RSVPForm entityID={props.entityID} />
    </div>
  );
}

function RSVPForm(props: { entityID: string }) {
  let [state, setState] = useState<State>({ state: "default" });
  let { permissions } = useEntitySetContext();
  let { data, mutate } = useRSVPData();
  let setStatus = (status: RSVP_Status) => {
    if (data?.authToken) {
      submitRSVP({ entity: props.entityID, status });
      mutate({
        authToken: data.authToken,
        rsvps: [
          ...data?.rsvps.filter((r) => r.entity !== props.entityID),
          {
            status,
            entity: props.entityID,
            phone_number: data.authToken.phone_number,
          },
        ],
      });
    } else setState({ status, state: "contact_details" });
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
          <div>You&apos;re {rsvpStatus}</div>|{" "}
          {rsvpStatus !== "GOING" && (
            <button onClick={() => setStatus("GOING")}>Going</button>
          )}
          {rsvpStatus !== "MAYBE" && (
            <button onClick={() => setStatus("MAYBE")}>Maybe</button>
          )}
          {rsvpStatus !== "NOT_GOING" && (
            <button onClick={() => setStatus("NOT_GOING")}>
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
            <button onClick={() => setStatus("GOING")}>going</button>
            <button onClick={() => setStatus("MAYBE")}>maybe</button>
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

  return (
    <div>
      {going.length > 0 && `${going.length} going`}
      {maybe.length > 0 &&
        `${going.length > 0 ? ", " : ""}${maybe.length} maybe`}
      {notGoing.length > 0 &&
        `${going.length > 0 || maybe.length > 0 ? ", " : ""}${notGoing.length} can't go`}
    </div>
  );
}

function SendUpdateButton() {
  return <button>send update</button>;
}

function ContactDetailsForm({
  status,
  entityID,
}: {
  status: RSVP_Status;
  entityID: string;
  setState: (s: State) => void;
}) {
  let { mutate } = useRSVPData();
  let [state, setState] = useState<
    { state: "details" } | { state: "confirm"; token: string }
  >({ state: "details" });
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    confirmationCode: "",
  });
  return state.state === "details" ? (
    <div className="flex flex-row gap-2">
      <input
        placeholder="name"
        value={formState.name}
        onChange={(e) =>
          setFormState((state) => ({ ...state, name: e.target.value }))
        }
      />
      <input
        placeholder="phone"
        value={formState.phone}
        onChange={(e) =>
          setFormState((state) => ({ ...state, phone: e.target.value }))
        }
      />
      <button
        onClick={async () => {
          let tokenId = await createPhoneAuthToken(formState.phone);
          setState({ state: "confirm", token: tokenId });
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
          if (token) {
            await submitRSVP({
              status,
              entity: entityID,
            });
            mutate();
          }
        }}
      >
        confirm
      </button>
    </div>
  );
}
