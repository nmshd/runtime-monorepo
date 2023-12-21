/* eslint-disable jest/expect-expect */
import { ConsumptionController, LocalRequest, LocalRequestStatus } from "@vermascht/consumption"
import {
    AcceptResponseItem,
    RelationshipCreationChangeRequestContent,
    RelationshipTemplateContent,
    Request,
    Response,
    ResponseWrapper
} from "@vermascht/content"
import { AccountController, CoreDate, Message, Relationship, RelationshipTemplate, Transport } from "@vermascht/transport"
import { expect } from "chai"
import { TestUtil } from "../../core/TestUtil"
import { RequestsIntegrationTest } from "./RequestsIntegrationTest"
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export class RequestEnd2EndTests extends RequestsIntegrationTest {
    public run(): void {
        const that = this
        const transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

        before(async function () {
            await transport.init()
        })

        describe("End2End Request/Response via Relationship Template/ChangeRequest", function () {
            let sAccountController: AccountController
            let sConsumptionController: ConsumptionController
            let rAccountController: AccountController
            let rConsumptionController: ConsumptionController

            let sTemplate: RelationshipTemplate
            let rTemplate: RelationshipTemplate
            let rLocalRequest: LocalRequest
            let rRelationship: Relationship
            let sRelationship: Relationship
            let sLocalRequest: LocalRequest

            before(async function () {
                this.timeout(30000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: sAccountController, consumptionController: sConsumptionController } =
                    accounts[0])
                sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItem,
                    TestRequestItemProcessor
                )
                ;({ accountController: rAccountController, consumptionController: rConsumptionController } =
                    accounts[1])
                rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItem,
                    TestRequestItemProcessor
                )
            })

            it("sender: create a Relationship Template with the Request", async function () {
                const request = Request.from({
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                })
                sTemplate = await sAccountController.relationshipTemplates.sendRelationshipTemplate({
                    content: RelationshipTemplateContent.from({ onNewRelationship: request }),
                    expiresAt: CoreDate.utc().add({ hours: 1 }),
                    maxNumberOfAllocations: 1
                })
            })

            it("recipient: load Relationship Template", async function () {
                rTemplate = await rAccountController.relationshipTemplates.loadPeerRelationshipTemplate(
                    sTemplate.id,
                    sTemplate.secretKey
                )
            })

            it("recipient: create Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.received({
                    receivedRequest: (rTemplate.cache!.content as RelationshipTemplateContent).onNewRelationship,
                    requestSourceObject: rTemplate
                })
            })

            it("recipient: check prerequisites of Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
                    requestId: rLocalRequest.id
                })
            })

            it("recipient: require manual decision of Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.requireManualDecision({
                    requestId: rLocalRequest.id
                })
            })

            it("recipient: accept Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.accept({
                    requestId: rLocalRequest.id.toString(),
                    items: [
                        {
                            accept: true
                        }
                    ]
                })
            })

            it("recipient: create Relationship with Response in Relationship Change", async function () {
                rRelationship = await rAccountController.relationships.sendRelationship({
                    template: rTemplate,
                    content: RelationshipCreationChangeRequestContent.from({
                        response: rLocalRequest.response!.content
                    })
                })
            })

            it("recipient: complete Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.complete({
                    requestId: rLocalRequest.id,
                    responseSourceObject: rRelationship.cache!.changes[0]
                })
            })

            it("sender: syncEverything to get Relationship Change with Response", async function () {
                const newRelationships = await TestUtil.syncUntilHasRelationships(sAccountController)
                sRelationship = newRelationships[0]
            }).timeout(20000)

            it("sender: create Local Request and Response from Relationship Change", async function () {
                const response = (
                    sRelationship.cache!.changes[0].request.content as RelationshipCreationChangeRequestContent
                ).response

                sLocalRequest =
                    await sConsumptionController.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
                        template: sTemplate,
                        responseSource: sRelationship.cache!.changes[0],
                        response
                    })
            })

            it("expectations", function () {
                // in the end, both Local Requests should be completed
                expect(rLocalRequest.status).to.equal(LocalRequestStatus.Completed)
                expect(sLocalRequest.status).to.equal(LocalRequestStatus.Completed)

                // the ids of the Local Requests should be equal
                expect(rLocalRequest.id.toString()).to.equal(sLocalRequest.id.toString())

                // make sure (de-)serialization worked as expected
                expect(sTemplate.cache!.content).to.be.instanceOf(RelationshipTemplateContent)
                expect((sTemplate.cache!.content as RelationshipTemplateContent).onNewRelationship).to.be.instanceOf(
                    Request
                )

                expect(rTemplate.cache!.content).to.be.instanceOf(RelationshipTemplateContent)
                expect((rTemplate.cache!.content as RelationshipTemplateContent).onNewRelationship).to.be.instanceOf(
                    Request
                )

                expect(sLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(rLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)

                expect(
                    (sRelationship.cache!.changes[0].request.content as RelationshipCreationChangeRequestContent)
                        .response
                ).to.be.instanceOf(Response)
                expect(
                    (rRelationship.cache!.changes[0].request.content as RelationshipCreationChangeRequestContent)
                        .response
                ).to.be.instanceOf(Response)

                expect(sLocalRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
                expect(rLocalRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
            })
        })

        describe("End2End Request/Response via Messages", function () {
            let sAccountController: AccountController
            let sConsumptionController: ConsumptionController
            let rAccountController: AccountController
            let rConsumptionController: ConsumptionController

            let sLocalRequest: LocalRequest
            let sMessageWithRequest: Message
            let rMessageWithRequest: Message
            let rLocalRequest: LocalRequest
            let rMessageWithResponse: Message
            let sMessageWithResponse: Message

            this.timeout(3000)

            before(async function () {
                this.timeout(30000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: sAccountController, consumptionController: sConsumptionController } =
                    accounts[0])
                sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItem,
                    TestRequestItemProcessor
                )
                ;({ accountController: rAccountController, consumptionController: rConsumptionController } =
                    accounts[1])
                rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItem,
                    TestRequestItemProcessor
                )

                await TestUtil.addRelationship(sAccountController, rAccountController)
            })

            it("sender: create Local Request", async function () {
                sLocalRequest = await sConsumptionController.outgoingRequests.create({
                    content: Request.from({
                        items: [TestRequestItem.from({ mustBeAccepted: false })]
                    }),
                    peer: rAccountController.identity.address
                })
            })

            it("sender: send Message with Request", async function () {
                sMessageWithRequest = await sAccountController.messages.sendMessage({
                    content: sLocalRequest.content,
                    recipients: [rAccountController.identity.address]
                })
            })

            it("sender: mark Local Request as sent", async function () {
                sLocalRequest = await sConsumptionController.outgoingRequests.sent({
                    requestId: sLocalRequest.id,
                    requestSourceObject: sMessageWithRequest
                })
            })

            it("recipient: syncEverything to get Message with Request", async function () {
                const messages = await TestUtil.syncUntilHasMessages(rAccountController)
                rMessageWithRequest = messages[0]
            }).timeout(20000)

            it("recipient: create Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.received({
                    receivedRequest: rMessageWithRequest.cache!.content as Request,
                    requestSourceObject: rMessageWithRequest
                })
            })

            it("recipient: check prerequisites of Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
                    requestId: rLocalRequest.id
                })
            })

            it("recipient: require manual decision of Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.requireManualDecision({
                    requestId: rLocalRequest.id
                })
            })

            it("recipient: accept Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.accept({
                    requestId: rLocalRequest.id.toString(),
                    items: [
                        {
                            accept: true
                        }
                    ]
                })
            })

            it("recipient: send Message with Response", async function () {
                rMessageWithResponse = await rAccountController.messages.sendMessage({
                    content: ResponseWrapper.from({
                        response: rLocalRequest.response!.content,
                        requestId: rLocalRequest.id,
                        requestSourceType: "Message",
                        requestSourceReference: rMessageWithRequest.id
                    }),
                    recipients: [sAccountController.identity.address]
                })
            })

            it("recipient: complete Local Request", async function () {
                const responseWrapper = rMessageWithResponse.cache!.content as ResponseWrapper
                expect(responseWrapper).to.be.instanceOf(ResponseWrapper)

                const message = await rAccountController.messages.getMessage(responseWrapper.requestSourceReference)
                expect(message).to.exist

                rLocalRequest = await rConsumptionController.incomingRequests.complete({
                    requestId: responseWrapper.requestId,
                    responseSourceObject: message
                })
            })

            it("sender: syncEverything to get Message with Response", async function () {
                const messages = await TestUtil.syncUntilHasMessages(sAccountController)
                sMessageWithResponse = messages[0]
            }).timeout(20000)

            it("sender: complete Local Request", async function () {
                const responseWrapper = sMessageWithResponse.cache!.content as ResponseWrapper

                sLocalRequest = await sConsumptionController.outgoingRequests.complete({
                    requestId: responseWrapper.requestId,
                    responseSourceObject: sMessageWithResponse,
                    receivedResponse: responseWrapper.response
                })
            })

            it("expectations", function () {
                // in the end, both Local Requests should be completed
                expect(rLocalRequest.status).to.equal(LocalRequestStatus.Completed)
                expect(sLocalRequest.status).to.equal(LocalRequestStatus.Completed)

                // the ids of the Local Requests should be equal
                expect(rLocalRequest.id.toString()).to.equal(sLocalRequest.id.toString())

                // make sure (de-)serialization worked as expected
                expect(sMessageWithRequest.cache!.content).to.be.instanceOf(Request)
                expect(rMessageWithRequest.cache!.content).to.be.instanceOf(Request)
                expect(sLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(rLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(sMessageWithResponse.cache!.content).to.be.instanceOf(ResponseWrapper)
                expect(rMessageWithResponse.cache!.content).to.be.instanceOf(ResponseWrapper)
                expect(sLocalRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
                expect(rLocalRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
            })
        })

        describe("End2End Request via Template and Response via Message", function () {
            let sAccountController: AccountController
            let sConsumptionController: ConsumptionController
            let rAccountController: AccountController
            let rConsumptionController: ConsumptionController

            let sLocalRequest: LocalRequest
            let rLocalRequest: LocalRequest
            let rMessageWithResponse: Message
            let sMessageWithResponse: Message
            let sTemplate: RelationshipTemplate
            let rTemplate: RelationshipTemplate

            this.timeout(3000)

            before(async function () {
                this.timeout(30000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: sAccountController, consumptionController: sConsumptionController } =
                    accounts[0])
                sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItem,
                    TestRequestItemProcessor
                )
                ;({ accountController: rAccountController, consumptionController: rConsumptionController } =
                    accounts[1])
                rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItem,
                    TestRequestItemProcessor
                )

                await TestUtil.addRelationship(sAccountController, rAccountController)
            })

            it("sender: create a Relationship Template with the Request", async function () {
                const request = Request.from({
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                })
                sTemplate = await sAccountController.relationshipTemplates.sendRelationshipTemplate({
                    content: RelationshipTemplateContent.from({
                        onNewRelationship: request,
                        onExistingRelationship: request
                    }),
                    expiresAt: CoreDate.utc().add({ hours: 1 }),
                    maxNumberOfAllocations: 1
                })
            })

            it("recipient: load Relationship Template", async function () {
                rTemplate = await rAccountController.relationshipTemplates.loadPeerRelationshipTemplate(
                    sTemplate.id,
                    sTemplate.secretKey
                )
            })

            it("recipient: create Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.received({
                    receivedRequest: (rTemplate.cache!.content as RelationshipTemplateContent).onExistingRelationship!,
                    requestSourceObject: rTemplate
                })
            })

            it("recipient: check prerequisites of Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
                    requestId: rLocalRequest.id
                })
            })

            it("recipient: require manual decision of Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.requireManualDecision({
                    requestId: rLocalRequest.id
                })
            })

            it("recipient: accept Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.accept({
                    requestId: rLocalRequest.id.toString(),
                    items: [
                        {
                            accept: true
                        }
                    ]
                })
            })

            it("recipient: send Message with Response", async function () {
                rMessageWithResponse = await rAccountController.messages.sendMessage({
                    content: ResponseWrapper.from({
                        response: rLocalRequest.response!.content,
                        requestId: rLocalRequest.id,
                        requestSourceReference: rTemplate.id,
                        requestSourceType: "RelationshipTemplate"
                    }),
                    recipients: [sAccountController.identity.address]
                })
            })

            it("recipient: complete Local Request", async function () {
                rLocalRequest = await rConsumptionController.incomingRequests.complete({
                    requestId: rLocalRequest.id,
                    responseSourceObject: rMessageWithResponse
                })
            })

            it("sender: syncEverything to get Message with Response", async function () {
                const messages = await TestUtil.syncUntilHasMessages(sAccountController)
                sMessageWithResponse = messages[0]
            }).timeout(20000)

            it("sender: create Local Request and Response from Relationship Change", async function () {
                const responseWrapper = sMessageWithResponse.cache!.content as ResponseWrapper
                expect(responseWrapper).to.be.instanceOf(ResponseWrapper)

                const template = await sAccountController.relationshipTemplates.getRelationshipTemplate(
                    responseWrapper.requestSourceReference
                )
                expect(template).to.exist

                sLocalRequest =
                    await sConsumptionController.outgoingRequests.createAndCompleteFromRelationshipTemplateResponse({
                        template: template!,
                        responseSource: sMessageWithResponse,
                        response: responseWrapper.response
                    })
            })

            it("expectations", function () {
                // in the end, both Local Requests should be completed
                expect(rLocalRequest.status).to.equal(LocalRequestStatus.Completed)
                expect(sLocalRequest.status).to.equal(LocalRequestStatus.Completed)

                // the ids of the Local Requests should be equal
                expect(rLocalRequest.id.toString()).to.equal(sLocalRequest.id.toString())

                // make sure (de-)serialization worked as expected
                expect(sTemplate.cache!.content).to.be.instanceOf(RelationshipTemplateContent)
                expect(
                    (sTemplate.cache!.content as RelationshipTemplateContent).onExistingRelationship
                ).to.be.instanceOf(Request)

                expect(rTemplate.cache!.content).to.be.instanceOf(RelationshipTemplateContent)
                expect(
                    (rTemplate.cache!.content as RelationshipTemplateContent).onExistingRelationship
                ).to.be.instanceOf(Request)

                expect(sLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(rLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)

                expect(sLocalRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
                expect(rLocalRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)

                expect(sLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(rLocalRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(sMessageWithResponse.cache!.content).to.be.instanceOf(ResponseWrapper)
                expect(rMessageWithResponse.cache!.content).to.be.instanceOf(ResponseWrapper)
            })
        })
    }
}
