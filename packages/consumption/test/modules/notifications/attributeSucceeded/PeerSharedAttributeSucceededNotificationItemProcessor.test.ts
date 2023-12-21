import {
    ConsumptionController,
    LocalNotification,
    LocalNotificationSource,
    LocalNotificationStatus,
    PeerSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededNotificationItemProcessor
} from "@vermascht/consumption"
import {
    IdentityAttribute,
    Notification,
    PeerSharedAttributeSucceededNotificationItem,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality
} from "@vermascht/content"
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@vermascht/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../../core/IntegrationTest"
import { TestUtil } from "../../../core/TestUtil"
import { MockEventBus } from "../../MockEventBus"

export class PeerSharedAttributeSucceededNotificationItemProcessorTest extends IntegrationTest {
    public run(): void {
        const that = this
        const mockEventBus = new MockEventBus()

        describe("PeerSharedAttributeSucceededNotificationItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, mockEventBus, that.loggerFactory)

            let consumptionController: ConsumptionController
            let testAccount: AccountController

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                ;({ accountController: testAccount, consumptionController } = account)
            })

            beforeEach(async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()
                for (const attribute of attributes) {
                    await consumptionController.attributes.deleteAttributeUnsafe(attribute.id)
                }
                mockEventBus.clearPublishedEvents()
            })

            after(async function () {
                await testAccount.close()
            })

            afterEach(async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()

                for (const attribute of attributes) {
                    await consumptionController.attributes.deleteAttribute(attribute)
                }
            })

            it("runs all processor methods for a peer shared identity attribute", async function () {
                const peerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthName",
                            value: "Schenkel"
                        },
                        owner: CoreAddress.from("peer")
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef")
                    }
                })

                const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
                    predecessorId: peerSharedIdentityAttribute.id,
                    successorId: CoreId.from("newAttributeId"),
                    successorContent: IdentityAttribute.from({
                        value: {
                            "@type": "BirthName",
                            value: "Wade"
                        },
                        owner: CoreAddress.from("peer")
                    })
                })
                const notification = LocalNotification.from({
                    id: CoreId.from("notificationRef"),
                    source: LocalNotificationSource.from({
                        type: "Message",
                        reference: CoreId.from("messageRef")
                    }),
                    status: LocalNotificationStatus.Open,
                    isOwn: false,
                    peer: CoreAddress.from("peer"),
                    createdAt: CoreDate.utc(),
                    content: Notification.from({
                        id: CoreId.from("notificationRef"),
                        items: [notificationItem]
                    }),
                    receivedByDevice: CoreId.from("deviceId")
                })
                const processor = new PeerSharedAttributeSucceededNotificationItemProcessor(consumptionController)

                /* Run and check validation. */
                const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(
                    notificationItem,
                    notification
                )
                expect(checkResult.isError()).to.be.false

                /* Run process() and validate its results. */
                const event = await processor.process(notificationItem, notification)
                expect(event).to.be.instanceOf(PeerSharedAttributeSucceededEvent)
                const { predecessor, successor } = event.data
                expect(notificationItem.successorId.equals(successor.id)).to.be.true
                expect(notificationItem.predecessorId.equals(predecessor.id)).to.be.true
                expect(predecessor.succeededBy?.equals(successor.id)).to.be.true
                expect(successor.succeeds?.equals(predecessor.id)).to.be.true
                expect(peerSharedIdentityAttribute.id.equals(predecessor.id)).to.be.true

                /* Manually trigger and verify rollback. */
                await processor.rollback(notificationItem, notification)
                const successorAfterRollback = await consumptionController.attributes.getLocalAttribute(
                    notificationItem.successorId
                )
                expect(successorAfterRollback).to.be.undefined
                const predecessorAfterRollback = await consumptionController.attributes.getLocalAttribute(
                    notificationItem.predecessorId
                )
                expect(predecessorAfterRollback).to.not.be.undefined
                expect(predecessorAfterRollback!.succeededBy).to.be.undefined
            })

            it("runs all processor methods for a peer shared relationship attribute", async function () {
                const peerSharedRelationshipAttribute = await consumptionController.attributes.createAttributeUnsafe({
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: CoreAddress.from("peer"),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("peer"),
                        requestReference: CoreId.from("reqRef")
                    }
                })

                const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
                    predecessorId: peerSharedRelationshipAttribute.id,
                    successorId: CoreId.from("newAttributeId"),
                    successorContent: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "1337",
                            title: "Customer ID"
                        },
                        owner: CoreAddress.from("peer"),
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    })
                })
                const notification = LocalNotification.from({
                    id: CoreId.from("notificationRef"),
                    source: LocalNotificationSource.from({
                        type: "Message",
                        reference: CoreId.from("messageRef")
                    }),
                    status: LocalNotificationStatus.Open,
                    isOwn: false,
                    peer: CoreAddress.from("peer"),
                    createdAt: CoreDate.utc(),
                    content: Notification.from({
                        id: CoreId.from("notificationRef"),
                        items: [notificationItem]
                    }),
                    receivedByDevice: CoreId.from("deviceId")
                })
                const processor = new PeerSharedAttributeSucceededNotificationItemProcessor(consumptionController)

                /* Run and check validation. */
                const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(
                    notificationItem,
                    notification
                )
                expect(checkResult.isError()).to.be.false

                /* Run process() and validate its results. */
                const event = await processor.process(notificationItem, notification)
                expect(event).to.be.instanceOf(PeerSharedAttributeSucceededEvent)
                const { predecessor, successor } = event.data
                expect(notificationItem.successorId.equals(successor.id)).to.be.true
                expect(notificationItem.predecessorId.equals(predecessor.id)).to.be.true
                expect(predecessor.succeededBy?.equals(successor.id)).to.be.true
                expect(successor.succeeds?.equals(predecessor.id)).to.be.true
                expect(peerSharedRelationshipAttribute.id.equals(predecessor.id)).to.be.true

                /* Manually trigger and verify rollback. */
                await processor.rollback(notificationItem, notification)
                const successorAfterRollback = await consumptionController.attributes.getLocalAttribute(
                    notificationItem.successorId
                )
                expect(successorAfterRollback).to.be.undefined
                const predecessorAfterRollback = await consumptionController.attributes.getLocalAttribute(
                    notificationItem.predecessorId
                )
                expect(predecessorAfterRollback).to.not.be.undefined
                expect(predecessorAfterRollback!.succeededBy).to.be.undefined
            })

            it("detects spoofing attempts", async function () {
                /* A naughty peer is trying to succeed attributes owned
                 * not by himself, but by another peer. This must be
                 * caught by the validation. */
                const peerSharedIdentityAttribute = await consumptionController.attributes.createAttributeUnsafe({
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthName",
                            value: "Schenkel"
                        },
                        owner: CoreAddress.from("otherPeer")
                    }),
                    shareInfo: {
                        peer: CoreAddress.from("otherPeer"),
                        requestReference: CoreId.from("reqRef")
                    }
                })

                const notificationItem = PeerSharedAttributeSucceededNotificationItem.from({
                    predecessorId: peerSharedIdentityAttribute.id,
                    successorId: CoreId.from("newAttributeId"),
                    successorContent: IdentityAttribute.from({
                        value: {
                            "@type": "BirthName",
                            value: "Wade"
                        },
                        owner: CoreAddress.from("otherPeer")
                    })
                })

                const notification = LocalNotification.from({
                    id: CoreId.from("notificationRef"),
                    source: LocalNotificationSource.from({
                        type: "Message",
                        reference: CoreId.from("messageRef")
                    }),
                    status: LocalNotificationStatus.Open,
                    isOwn: false,
                    peer: CoreAddress.from("naughtyPeer"),
                    createdAt: CoreDate.utc(),
                    content: Notification.from({
                        id: CoreId.from("notificationRef"),
                        items: [notificationItem]
                    }),
                    receivedByDevice: CoreId.from("deviceId")
                })
                const processor = new PeerSharedAttributeSucceededNotificationItemProcessor(consumptionController)

                const checkResult = await processor.checkPrerequisitesOfIncomingNotificationItem(
                    notificationItem,
                    notification
                )
                expect(checkResult).to.be.an.errorValidationResult({
                    code: "error.consumption.attributes.successionPeerIsNotOwner",
                    message: "The peer of the succeeded attribute is not its owner. This may be an attempt of spoofing."
                })
            })
        })
    }
}
