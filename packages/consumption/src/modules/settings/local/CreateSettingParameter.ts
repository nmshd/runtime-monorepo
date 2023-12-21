import { Serializable } from "@js-soft/ts-serval"
import { CoreDate, CoreId } from "@vermascht/transport"
import { SettingScope } from "./Setting"

export interface ICreateSettingParameters {
    key: string
    value: Serializable
    reference?: CoreId
    scope?: SettingScope
    succeedsAt?: CoreDate
    succeedsItem?: CoreId
}
