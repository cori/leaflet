import { Database } from "supabase/database.types";
import { BlockProps, BaseBlock, ListMarker, Block } from "./Block";
import { useState } from "react";
import { submitRSVP } from "actions/phone_rsvp_to_event";

type RSVP_Status = Database["public"]["Enums"]["rsvp_status"];
type State =
  | {
      state: "default";
    }
  | { state: "contact_details"; status: RSVP_Status }
  | {
      state: "confirm_contact";
    };

export function RSVPBlock(props: BlockProps) {
  return (
    <div className="flex flex-col gap-2 border p-2 w-full">
      <RSVPForm />
    </div>
  );
}

function RSVPForm() {
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
    return <ContactDetailsForm status={state.status} />;
}

function ContactDetailsForm({ status }: { status: RSVP_Status }) {
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
  });

  return (
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
          await submitRSVP({
            phone_number: formState.phone,
            entity: formState.name,
            status: status,
          });
        }}
      >
        submit
      </button>
    </div>
  );
}
