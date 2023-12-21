import { type } from "@js-soft/ts-serval"
import { INotificationItem, NotificationItem } from "@vermascht/content"

@type("TestNotificationItem")
export class TestNotificationItem extends NotificationItem {
    public static from(value: INotificationItem): TestNotificationItem {
        return super.fromAny(value)
    }
}
