import { ConsumptionController } from "@vermascht/consumption"
import { ConsumptionServices, DataViewExpander, IdentityDVO, TransportServices } from "@vermascht/runtime"
import { AccountController } from "@vermascht/transport"
import { AppServices } from "../../extensibility"
import { LocalAccountDTO } from "./LocalAccountDTO"

export interface LocalAccountSession {
    address: string
    account: LocalAccountDTO
    transportServices: TransportServices
    consumptionServices: ConsumptionServices
    expander: DataViewExpander
    appServices: AppServices
    accountController: AccountController
    consumptionController: ConsumptionController
    selectedRelationship?: IdentityDVO
    expiresAt?: string
}
