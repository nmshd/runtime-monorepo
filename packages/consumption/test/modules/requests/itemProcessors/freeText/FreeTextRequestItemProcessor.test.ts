import { ConsumptionController, FreeTextRequestItemProcessor } from "@vermascht/consumption"
import { FreeTextRequestItem } from "@vermascht/content"
import { Transport } from "@vermascht/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../../../core/IntegrationTest"
import { TestUtil } from "../../../../core/TestUtil"

export class FreeTextRequestItemProcessorTest extends IntegrationTest {
    public run(): void {
        const that = this

        describe("FreeTextRequestItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

            let consumptionController: ConsumptionController

            let processor: FreeTextRequestItemProcessor

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                consumptionController = account.consumptionController

                processor = new FreeTextRequestItemProcessor(consumptionController)
            })

            afterEach(async function () {
                const listeners = await consumptionController.attributeListeners.getAttributeListeners()

                for (const listener of listeners) {
                    await consumptionController.attributeListeners["attributeListeners"].delete(listener)
                }
            })

            describe("canAccept", function () {
                it("returns success when called with valid params", function () {
                    const requestItem = FreeTextRequestItem.from({
                        mustBeAccepted: true,
                        freeText: "This is a TestRequest"
                    })

                    const result = processor.canAccept(requestItem, {
                        accept: true,
                        freeText: "This is a TestResponse"
                    })

                    expect(result).to.be.a.successfulValidationResult()
                })

                it("returns an error when called with invalid params", function () {
                    const requestItem = FreeTextRequestItem.from({
                        mustBeAccepted: true,
                        freeText: "This is a TestRequest"
                    })

                    const result = processor.canAccept(requestItem, {
                        accept: true,
                        freeText: {} as string
                    })

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.canAccept.invalidAcceptParameters"
                    })
                })
            })

            describe("accept", function () {
                it("creates a FreeTextAcceptResponseItem when called with valid params", function () {
                    const requestItem = FreeTextRequestItem.from({
                        mustBeAccepted: true,
                        freeText: "This is a TestRequest"
                    })

                    const result = processor.accept(requestItem, {
                        accept: true,
                        freeText: "This is a TestResponse"
                    })

                    expect(result.freeText).to.equal("This is a TestResponse")
                })
            })
        })
    }
}
