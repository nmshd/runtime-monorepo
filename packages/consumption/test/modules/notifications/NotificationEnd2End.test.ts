import {
    ConsumptionController,
    ConsumptionIds,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus
} from "@vermascht/consumption"
import { Notification } from "@vermascht/content"
import {
    AccountController,
    CoreAddress,
    CoreDate,
    CoreId,
    Message,
    SynchronizedCollection,
    Transport
} from "@vermascht/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestNotificationItem, TestNotificationItemProcessor } from "./testHelpers/TestNotificationItem"

export class NotificationEnd2End extends IntegrationTest {
    public run(): void {
        const that = this
        const transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

        before(async function () {
            await transport.init()
        })

        beforeEach(function () {
            TestNotificationItemProcessor.reset()
        })

        describe("End2End Notification via Messages", function () {
            let sAccountController: AccountController
            let sConsumptionController: ConsumptionController
            let rAccountController: AccountController
            let rConsumptionController: ConsumptionController

            let sMessageWithNotification: Message
            let rMessageWithNotification: Message
            let rLocalNotification: LocalNotification

            let rNotificationsCollection: SynchronizedCollection
            let sNotificationsCollection: SynchronizedCollection

            let sLocalNotification: LocalNotification

            this.timeout(3000)

            before(async function () {
                this.timeout(30000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: sAccountController, consumptionController: sConsumptionController } =
                    accounts[0])
                sConsumptionController.notifications["processorRegistry"].registerProcessor(
                    TestNotificationItem,
                    TestNotificationItemProcessor
                )
                ;({ accountController: rAccountController, consumptionController: rConsumptionController } =
                    accounts[1])
                rConsumptionController.notifications["processorRegistry"].registerProcessor(
                    TestNotificationItem,
                    TestNotificationItemProcessor
                )
                rNotificationsCollection =
                    await rConsumptionController.accountController.getSynchronizedCollection("Notifications")
                sNotificationsCollection =
                    await sConsumptionController.accountController.getSynchronizedCollection("Notifications")

                await TestUtil.addRelationship(sAccountController, rAccountController)

                const id = await ConsumptionIds.notification.generate()
                const localNotification = LocalNotification.from({
                    id,
                    content: Notification.from({ id, items: [TestNotificationItem.from({})] }),
                    isOwn: true,
                    peer: CoreAddress.from("anAddress"),
                    createdAt: CoreDate.utc(),
                    status: LocalNotificationStatus.Open,
                    source: LocalNotificationSource.message(CoreId.from("anId"))
                })

                sLocalNotification = localNotification

                sMessageWithNotification = await sAccountController.messages.sendMessage({
                    content: localNotification.content,
                    recipients: [rAccountController.identity.address]
                })
            })

            it("sender: sent Notification", async function () {
                const localNotification = await sConsumptionController.notifications.sent(sMessageWithNotification)
                expect(localNotification.status).to.equal(LocalNotificationStatus.Sent)
                expect(localNotification.content.items[0]).to.be.instanceOf(TestNotificationItem)

                const persistedLocalNotification = await sNotificationsCollection.findOne({
                    id: localNotification.id.toString()
                })
                expect(persistedLocalNotification).to.exist
                expect(persistedLocalNotification.status).to.equal(LocalNotificationStatus.Sent)
            })

            it("recipient: syncEverything to get Message with Notification", async function () {
                const messages = await TestUtil.syncUntilHasMessages(rAccountController)
                rMessageWithNotification = messages[0]
                expect(rMessageWithNotification.cache!.content).to.be.instanceOf(Notification)
            }).timeout(20000)

            it("recipient: received Notification", async function () {
                rLocalNotification = await rConsumptionController.notifications.received(rMessageWithNotification)
                expect(rLocalNotification.status).to.equal(LocalNotificationStatus.Open)
                expect(rLocalNotification.id.toString()).to.equal(sLocalNotification.id.toString())
                expect(rLocalNotification.content.items[0]).to.be.instanceOf(TestNotificationItem)

                const rLocalNotificationDB = await rNotificationsCollection.findOne({
                    id: rLocalNotification.id.toString()
                })
                expect(rLocalNotificationDB).to.exist
                expect(rLocalNotificationDB.status).to.equal(LocalNotificationStatus.Open)

                expect(TestNotificationItemProcessor.processedItems).to.have.lengthOf(0)
            })

            it("recipient: process Notification", async function () {
                const processedNotifiocation = await rConsumptionController.notifications.processNotificationById(
                    rLocalNotification.id
                )

                expect(processedNotifiocation.status).to.equal(LocalNotificationStatus.Completed)

                const rLocalNotificationDB = await rNotificationsCollection.findOne({
                    id: rLocalNotification.id.toString()
                })
                expect(rLocalNotificationDB).to.exist
                expect(rLocalNotificationDB.status).to.equal(LocalNotificationStatus.Completed)

                expect(TestNotificationItemProcessor.processedItems).to.have.lengthOf(1)
            })

            it("recipient: processes open notifactions received by current device", async function () {
                const id = await ConsumptionIds.notification.generate()
                await rNotificationsCollection.create(
                    LocalNotification.from({
                        id,
                        content: Notification.from({ id, items: [TestNotificationItem.from({})] }),
                        isOwn: false,
                        peer: CoreAddress.from("anAddress"),
                        createdAt: CoreDate.utc(),
                        status: LocalNotificationStatus.Open,
                        source: LocalNotificationSource.message(CoreId.from("anId")),
                        receivedByDevice: rAccountController.activeDevice.id
                    })
                )

                await rConsumptionController.notifications.processOpenNotifactionsReceivedByCurrentDevice()
                expect(TestNotificationItemProcessor.processedItems).to.have.lengthOf(1)
            })

            it("recipient: processes no notifactions received by other device", async function () {
                const id = await ConsumptionIds.notification.generate()
                await rNotificationsCollection.create(
                    LocalNotification.from({
                        id,
                        content: Notification.from({ id, items: [TestNotificationItem.from({})] }),
                        isOwn: false,
                        peer: CoreAddress.from("anAddress"),
                        createdAt: CoreDate.utc(),
                        status: LocalNotificationStatus.Open,
                        source: LocalNotificationSource.message(CoreId.from("anId")),
                        receivedByDevice: CoreId.from("anotherDevice")
                    })
                )

                await rConsumptionController.notifications.processOpenNotifactionsReceivedByCurrentDevice()
                expect(TestNotificationItemProcessor.processedItems).to.have.lengthOf(0)
            })
        })
    }
}
