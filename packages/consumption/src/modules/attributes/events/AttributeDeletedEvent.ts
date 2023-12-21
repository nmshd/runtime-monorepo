import { TransportDataEvent } from "@vermascht/transport"
import { LocalAttribute } from "../local/LocalAttribute"

export class AttributeDeletedEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.attributeDeleted"

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(AttributeDeletedEvent.namespace, eventTargetAddress, data)
    }
}
