import { LocalNotification, LocalNotificationSource, LocalNotificationStatus } from "@vermascht/consumption"
import { Notification } from "@vermascht/content"
import { CoreAddress, CoreDate, CoreId } from "@vermascht/transport"
import { expect } from "chai"
import { UnitTest } from "../../../core/UnitTest"
import { TestNotificationItem } from "../testHelpers/TestNotificationItem"

export class LocalNotificationTest extends UnitTest {
    public run(): void {
        describe("LocalNotification", function () {
            it("creates objects of all nested classes", function () {
                const localNotification = LocalNotification.from({
                    id: CoreId.from("anId"),
                    content: Notification.from({ id: CoreId.from("anId"), items: [TestNotificationItem.from({})] }),
                    isOwn: true,
                    peer: CoreAddress.from("anAddress"),
                    createdAt: CoreDate.utc(),
                    status: LocalNotificationStatus.Open,
                    source: LocalNotificationSource.message(CoreId.from("anId"))
                })

                expect(localNotification).to.be.instanceOf(LocalNotification)
                expect(localNotification.content.items[0]).to.be.instanceOf(TestNotificationItem)
                expect(localNotification.source).to.be.instanceOf(LocalNotificationSource)
            })

            it("throws when receivedByDevice is defined for an own message", function () {
                expect(() =>
                    LocalNotification.from({
                        id: CoreId.from("anId"),
                        content: Notification.from({ id: CoreId.from("anId"), items: [TestNotificationItem.from({})] }),
                        peer: CoreAddress.from("anAddress"),
                        createdAt: CoreDate.utc(),
                        status: LocalNotificationStatus.Open,
                        source: LocalNotificationSource.message(CoreId.from("anId")),

                        // not allowed
                        isOwn: true,
                        receivedByDevice: CoreId.from("aDeviceId")
                    })
                ).to.throw("You cannot define receivedByDevice for an own message.")
            })

            it("throws when receivedByDevice is not defined for a peer message", function () {
                expect(() =>
                    LocalNotification.from({
                        id: CoreId.from("anId"),
                        content: Notification.from({ id: CoreId.from("anId"), items: [TestNotificationItem.from({})] }),
                        peer: CoreAddress.from("anAddress"),
                        createdAt: CoreDate.utc(),
                        status: LocalNotificationStatus.Open,
                        source: LocalNotificationSource.message(CoreId.from("anId")),

                        // not allowed
                        isOwn: false,
                        receivedByDevice: undefined
                    })
                ).to.throw("You must define receivedByDevice for a peer message.")
            })
        })
    }
}
