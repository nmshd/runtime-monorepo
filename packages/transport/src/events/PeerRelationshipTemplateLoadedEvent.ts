import { RelationshipTemplate } from "../modules/relationshipTemplates/local/RelationshipTemplate"
import { TransportDataEvent } from "./TransportDataEvent"

export class PeerRelationshipTemplateLoadedEvent extends TransportDataEvent<RelationshipTemplate> {
    public static readonly namespace = "transport.peerRelationshipTemplateLoaded"

    public constructor(eventTargetAddress: string, data: RelationshipTemplate) {
        super(PeerRelationshipTemplateLoadedEvent.namespace, eventTargetAddress, data)
    }
}
