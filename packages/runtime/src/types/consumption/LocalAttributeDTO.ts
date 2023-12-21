import { LocalAttributeShareInfoJSON } from "@vermascht/consumption";
import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@vermascht/content";

export interface LocalAttributeDTO {
    id: string;
    parentId?: string;
    createdAt: string;
    content: IdentityAttributeJSON | RelationshipAttributeJSON;
    succeeds?: string;
    succeededBy?: string;
    shareInfo?: LocalAttributeShareInfoJSON;
}
