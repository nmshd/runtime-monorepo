import { TransportDataEvent } from "@vermascht/transport"
import { LocalRequest } from "../.."
import { ConsumptionError } from "../../../consumption/ConsumptionError"

export class IncomingRequestReceivedEvent extends TransportDataEvent<LocalRequest> {
    public static readonly namespace = "consumption.incomingRequestReceived"

    public constructor(eventTargetAddress: string, data: LocalRequest) {
        super(IncomingRequestReceivedEvent.namespace, eventTargetAddress, data)

        if (data.isOwn) throw new ConsumptionError("Cannot create this event for an outgoing Request")
    }
}
