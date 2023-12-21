import { TransportDataEvent } from "@vermascht/transport"
import { LocalAttribute } from "../local/LocalAttribute"

export class SharedAttributeCopyCreatedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.sharedAttributeCopyCreated"

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(SharedAttributeCopyCreatedEvent.namespace, eventTargetAddress, data)
    }
}
