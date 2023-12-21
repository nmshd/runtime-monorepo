import { CoreIdHelper } from "@vermascht/transport"

export class ConsumptionIds {
    public static readonly draft = new CoreIdHelper("LCLDRF")
    public static readonly setting = new CoreIdHelper("LCLSET")

    public static readonly attribute = new CoreIdHelper("ATT")
    public static readonly request = new CoreIdHelper("REQ")
    public static readonly attributeListener = new CoreIdHelper("ATL")
    public static readonly notification = new CoreIdHelper("NOT")
}
