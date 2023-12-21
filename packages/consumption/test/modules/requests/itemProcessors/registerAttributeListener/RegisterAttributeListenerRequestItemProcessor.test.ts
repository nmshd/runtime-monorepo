import {
    ConsumptionController,
    ConsumptionIds,
    LocalRequest,
    LocalRequestStatus,
    RegisterAttributeListenerRequestItemProcessor
} from "@vermascht/consumption"
import { RegisterAttributeListenerRequestItem, Request, ThirdPartyRelationshipAttributeQuery } from "@vermascht/content"
import { CoreAddress, CoreDate, CoreId, Transport } from "@vermascht/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../../../core/IntegrationTest"
import { TestUtil } from "../../../../core/TestUtil"

export class RegisterAttributeListenerRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        const that = this

        describe("CreateAttributeRequestItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

            let consumptionController: ConsumptionController

            let processor: RegisterAttributeListenerRequestItemProcessor

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                ;({ consumptionController } = account)

                processor = new RegisterAttributeListenerRequestItemProcessor(consumptionController)
            })

            afterEach(async function () {
                const listeners = await consumptionController.attributeListeners.getAttributeListeners()

                for (const listener of listeners) {
                    await consumptionController.attributeListeners["attributeListeners"].delete(listener)
                }
            })

            describe("accept", function () {
                it("creates an AttributeListener and persists it to the DB", async function () {
                    const requestItem = RegisterAttributeListenerRequestItem.from({
                        query: ThirdPartyRelationshipAttributeQuery.from({
                            key: "aKey",
                            owner: "anOwner",
                            thirdParty: ["aThirdParty"]
                        }),
                        mustBeAccepted: true
                    })

                    const senderAddress = CoreAddress.from("SenderAddress")
                    const incomingRequest = LocalRequest.from({
                        id: await ConsumptionIds.request.generate(),
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: senderAddress,
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const result = await processor.accept(
                        requestItem,
                        {
                            accept: true
                        },
                        incomingRequest
                    )

                    const listenerId = result.listenerId

                    const listener = await consumptionController.attributeListeners.getAttributeListener(
                        CoreId.from(listenerId)
                    )

                    expect(listener).to.exist
                })
            })
        })
    }
}
