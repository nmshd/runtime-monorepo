import { IdentityAttributeQueryJSON, ThirdPartyRelationshipAttributeQueryJSON } from "@vermascht/content";

export interface LocalAttributeListenerDTO {
    id: string;
    query: IdentityAttributeQueryJSON | ThirdPartyRelationshipAttributeQueryJSON;
    peer: string;
}
