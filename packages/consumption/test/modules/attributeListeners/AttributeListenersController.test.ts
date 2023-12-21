import { AttributeListenerCreatedEvent, ConsumptionController } from "@vermascht/consumption"
import { ThirdPartyRelationshipAttributeQuery } from "@vermascht/content"
import { AccountController, CoreAddress, Transport } from "@vermascht/transport"
import chai, { expect } from "chai"
import chaiSubset from "chai-subset"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { MockEventBus } from "../MockEventBus"

chai.use(chaiSubset)

export class AttributeListenersControllerTest extends IntegrationTest {
    public run(): void {
        const that = this
        const mockEventBus = new MockEventBus()

        describe("AttributeListenersController", function () {
            const transport = new Transport(that.connection, that.config, mockEventBus, that.loggerFactory)
            const dummyQuery = ThirdPartyRelationshipAttributeQuery.from({
                key: "aKey",
                owner: "anOwner",
                thirdParty: ["aThirdParty"]
            })
            const dummyPeer = CoreAddress.from("aPeer")

            let consumptionController: ConsumptionController
            let testAccount: AccountController

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                ;({ accountController: testAccount, consumptionController } = account)
            })

            beforeEach(function () {
                mockEventBus.clearPublishedEvents()
            })

            after(async function () {
                await testAccount.close()
            })

            afterEach(async function () {
                const listeners = await consumptionController.attributeListeners.getAttributeListeners()

                for (const listener of listeners) {
                    await consumptionController.attributeListeners["attributeListeners"].delete(listener)
                }
            })

            it("should create an attribute listener", async function () {
                const listener = await consumptionController.attributeListeners.createAttributeListener({
                    peer: dummyPeer,
                    query: dummyQuery
                })

                expect(listener).to.not.be.undefined

                mockEventBus.expectPublishedEvents(AttributeListenerCreatedEvent)
            })

            it("should get an attribute listener", async function () {
                const listener = await consumptionController.attributeListeners.createAttributeListener({
                    peer: dummyPeer,
                    query: dummyQuery
                })

                const retrievedListener = await consumptionController.attributeListeners.getAttributeListener(
                    listener.id
                )

                expect(retrievedListener).to.not.be.undefined
                expect(retrievedListener?.id.toString()).to.equal(listener.id.toString())
            })

            it("should get all attribute listeners", async function () {
                const listener = await consumptionController.attributeListeners.createAttributeListener({
                    peer: dummyPeer,
                    query: dummyQuery
                })

                const listeners = await consumptionController.attributeListeners.getAttributeListeners()

                expect(listeners).to.have.lengthOf(1)
                expect(listeners.map((l) => l.toJSON())).to.containSubset([{ id: listener.id.toString() }])
            })
        })
    }
}
