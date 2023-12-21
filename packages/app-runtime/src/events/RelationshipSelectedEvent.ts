import { DataEvent, IdentityDVO } from "@vermascht/runtime"

export class RelationshipSelectedEvent extends DataEvent<IdentityDVO> {
    public static readonly namespace: string = "app.relationshipSelected"

    public constructor(address: string, data: IdentityDVO) {
        super(RelationshipSelectedEvent.namespace, address, data)
    }
}
