import { Database } from "supabase/database.types";
import { BlockProps, BaseBlock, ListMarker, Block } from "./Block";
import { useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";
import { createPhoneAuthToken } from "actions/phone_auth/request_phone_auth_token";
import { confirmPhoneAuthToken } from "actions/phone_auth/confirm_phone_auth_token";
import { usePhoneRSVPState } from "src/hooks/useRSVPStatus";

type RSVP_Status = Database["public"]["Enums"]["rsvp_status"];
type State =
  | {
      state: "default";
    }
  | { state: "contact_details"; status: RSVP_Status };

export function RSVPBlock(props: BlockProps) {
  let { rsvpStatus } = usePhoneRSVPState(props.entityID);
  if (rsvpStatus === null)
    return (
      <div className="flex flex-col gap-2 border p-2 w-full">
        <RSVPForm entityID={props.entityID} />
      </div>
    );
  else return <div>rsvpd!!! Status={rsvpStatus?.status}</div>;
}

function RSVPForm(props: { entityID: string }) {
  let [state, setState] = useState<State>({ state: "default" });
  if (state.state === "default")
    return (
      <>
        <div className="flex flex-row justify-between">
          <div className="flex flex-row gap-2">
            <button
              onClick={() =>
                setState({ status: "GOING", state: "contact_details" })
              }
            >
              going
            </button>
            <button
              onClick={() =>
                setState({ status: "MAYBE", state: "contact_details" })
              }
            >
              maybe
            </button>
            <button
              onClick={() =>
                setState({ status: "NOT_GOING", state: "contact_details" })
              }
            >
              can&apos;t go
            </button>
          </div>
          <button>send update</button>
        </div>
        <div>8 going</div>
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

function ContactDetailsForm({
  status,
  entityID,
}: {
  status: RSVP_Status;
  entityID: string;
  setState: (s: State) => void;
}) {
  let { mutateRSVPState } = usePhoneRSVPState(entityID);
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
            mutateRSVPState();
          }
        }}
      >
        confirm
      </button>
    </div>
  );
}
