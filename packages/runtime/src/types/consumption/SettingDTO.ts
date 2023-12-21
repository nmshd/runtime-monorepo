import { SettingScope } from "@vermascht/consumption";

export interface SettingDTO {
    id: string;
    key: string;
    scope: SettingScope;
    reference?: string;
    value: any;
    createdAt: string;
    succeedsItem?: string;
    succeedsAt?: string;
}
