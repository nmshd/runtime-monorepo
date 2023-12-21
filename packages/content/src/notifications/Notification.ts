import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId, ICoreId } from "@vermascht/transport"
import { INotificationItem, NotificationItem, NotificationItemJSON } from "./NotificationItem"

export interface NotificationJSON {
    "@type": "Notification"

    id: string

    /**
     * The items of the Notification.
     */
    items: NotificationItemJSON[]
}

export interface INotification extends ISerializable {
    id: ICoreId

    /**
     * The items of the Notification.
     */
    items: INotificationItem[]
}

@type("Notification")
export class Notification extends Serializable implements INotification {
    @serialize()
    @validate()
    public id: CoreId

    @serialize({ type: NotificationItem })
    @validate({ customValidator: (v) => (v.length < 1 ? "may not be empty" : undefined) })
    public items: NotificationItem[]

    public static from(value: INotification): Notification {
        return this.fromAny(value)
    }
}
