import { Serializable, type } from "@js-soft/ts-serval"
import {
    IRequest,
    IRequestItem,
    IRequestItemGroup,
    Request,
    RequestItem,
    RequestItemGroup,
    RequestItemGroupJSON,
    RequestItemJSON,
    RequestJSON
} from "@vermascht/content"
import { CoreDate, CoreId } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"
import { expectThrowsAsync } from "../testUtils"

interface TestRequestItemJSON extends RequestItemJSON {
    "@type": "TestRequestItem"
}

interface ITestRequestItem extends IRequestItem {}

@type("TestRequestItem")
class TestRequestItem extends RequestItem {}

export class RequestTest extends AbstractTest {
    public run(): void {
        describe("Request", function () {
            it("creates a Request and items from JSON", function () {
                const requestJSON = {
                    "@type": "Request",
                    "@version": "2",
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: true
                        } as TestRequestItemJSON,
                        {
                            "@type": "RequestItemGroup",
                            mustBeAccepted: true,
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: true
                                } as TestRequestItemJSON
                            ]
                        } as RequestItemGroupJSON
                    ]
                } as RequestJSON

                const request = Request.from(requestJSON)

                expect(request).to.be.instanceOf(Request)
                expect(request.items).to.have.lengthOf(2)

                const outerRequestItem = request.items[0] as TestRequestItem
                const requestItemGroup = request.items[1] as RequestItemGroup
                expect(outerRequestItem).to.be.instanceOf(TestRequestItem)
                expect(requestItemGroup).to.be.instanceOf(RequestItemGroup)

                expect(requestItemGroup.items).to.have.lengthOf(1)
            })

            it("creates a Request and items from serval interface", async function () {
                const requestInterface = {
                    "@type": "Request",
                    id: await CoreId.generate(),
                    items: [
                        {
                            "@type": "TestRequestItem",
                            expiresAt: CoreDate.utc(),
                            mustBeAccepted: true
                        } as ITestRequestItem,
                        {
                            "@type": "RequestItemGroup",
                            mustBeAccepted: true,
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: true
                                } as ITestRequestItem
                            ]
                        } as IRequestItemGroup
                    ]
                } as IRequest

                // const request = Serializable.fromUnknown(requestInterface) as Request
                const request = Request.from(requestInterface)

                expect(request).to.be.instanceOf(Request)
                expect(request.items).to.have.lengthOf(2)

                const outerRequestItem = request.items[0] as TestRequestItem
                const requestItemGroup = request.items[1] as RequestItemGroup
                expect(outerRequestItem).to.be.instanceOf(TestRequestItem)
                expect(requestItemGroup).to.be.instanceOf(RequestItemGroup)

                expect(requestItemGroup.items).to.have.lengthOf(1)
            })

            it("keeps all properties during serialization and deserialization", function () {
                const requestJSON = {
                    "@type": "Request",
                    id: "CNSREQ1",
                    expiresAt: "2020-01-01T00:00:00.000Z",
                    items: [
                        {
                            "@type": "TestRequestItem",
                            mustBeAccepted: true,
                            title: "outer item - title",
                            description: "outer item - description",
                            metadata: {
                                aMetadataKey: "outer item - metadata value"
                            }
                        } as TestRequestItemJSON,
                        {
                            "@type": "RequestItemGroup",
                            mustBeAccepted: true,
                            title: "item group - title",
                            description: "item group - description",
                            metadata: {
                                aMetadataKey: "item group - metadata value"
                            },
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: true,
                                    title: "inner item - title",
                                    description: "inner item - description",
                                    metadata: {
                                        aMetadataKey: "inner item - metadata value"
                                    }
                                } as TestRequestItemJSON
                            ]
                        } as RequestItemGroupJSON
                    ]
                } as RequestJSON

                const request = Request.from(requestJSON)

                const serializedRequest = request.toJSON()

                expect(serializedRequest).to.deep.equal(requestJSON)
            })

            it("must have at least one item", async function () {
                const requestJSON = {
                    "@type": "Request",
                    items: []
                } as RequestJSON

                await expectThrowsAsync(() => Request.from(requestJSON), "*Request.items*may not be empty")
            })

            it("groups must have at least one item", async function () {
                const requestJSON = {
                    "@type": "Request",
                    id: "CNSREQ1",
                    expiresAt: "2020-01-01T00:00:00.000Z",
                    items: [
                        {
                            "@type": "RequestItemGroup",
                            mustBeAccepted: true,
                            items: []
                        } as RequestItemGroupJSON
                    ]
                } as RequestJSON

                await expectThrowsAsync(() => Request.from(requestJSON), "*RequestItemGroup.items*may not be empty*")
            })

            it("mustBeAccepted is mandatory", async function () {
                const requestJSON = {
                    "@type": "Request",
                    items: [
                        {
                            "@type": "TestRequestItem"
                        }
                    ]
                } as RequestJSON

                await expectThrowsAsync(
                    () => Serializable.fromUnknown(requestJSON),
                    "TestRequestItem.mustBeAccepted*Value is not defined"
                )
            })

            it("should validate the RequestItemGroups mustBeAccepted flag inside a Request", async function () {
                const requestJSON = {
                    "@type": "Request",
                    items: [
                        {
                            "@type": "RequestItemGroup",
                            mustBeAccepted: true,
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false
                                }
                            ]
                        }
                    ]
                } as RequestJSON

                await expectThrowsAsync(
                    () => Serializable.fromUnknown(requestJSON),
                    "mustBeAccepted can only be true if at least one item is flagged as mustBeAccepted"
                )
            })
        })

        describe("RequestItemGroup", function () {
            it("should validate the RequestItemGroups mustBeAccepted flag", async function () {
                await expectThrowsAsync(
                    () =>
                        RequestItemGroup.from({
                            mustBeAccepted: true,
                            items: [TestRequestItem.fromAny({ mustBeAccepted: false })]
                        }),
                    "mustBeAccepted can only be true if at least one item is flagged as mustBeAccepted"
                )
            })
        })
    }
}
