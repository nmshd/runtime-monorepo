import { Serializable } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    Notification,
    PeerSharedAttributeSucceededNotificationItem,
    Surname
} from "@vermascht/content"
import { CoreAddress, CoreId } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"

export class NotificationTest extends AbstractTest {
    public run(): void {
        describe("Notification", function () {
            it("should create a Notification from JSON", function () {
                const notification = Serializable.fromUnknown({
                    "@type": "Notification",
                    id: "aNotificationId",
                    items: [
                        PeerSharedAttributeSucceededNotificationItem.from({
                            predecessorId: CoreId.from("anAttributeId"),
                            successorId: CoreId.from("anotherAttributeId"),
                            successorContent: IdentityAttribute.from({
                                owner: CoreAddress.from("anAddress"),
                                value: Surname.from("aSurname")
                            })
                        }).toJSON()
                    ]
                })

                expect(notification).instanceOf(Notification)
            })

            it("should throw an Error if items is empty", function () {
                let error: any

                try {
                    Serializable.fromUnknown({
                        "@type": "Notification",
                        id: "aNotificationId",
                        items: []
                    })
                } catch (e) {
                    error = e
                }

                expect(error).to.not.be.undefined
                expect(error.message).to.equal("Notification.items:Array :: may not be empty")
            })
        })
    }
}
