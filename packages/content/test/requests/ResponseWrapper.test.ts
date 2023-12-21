import {
    Response,
    ResponseItemJSON,
    ResponseItemResult,
    ResponseJSON,
    ResponseResult,
    ResponseWrapper
} from "@vermascht/content"
import { CoreId } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"

export class ResponseWrapperTest extends AbstractTest {
    public run(): void {
        describe("ResponseWrapper", function () {
            const response = Response.from({
                "@type": "Response",
                result: ResponseResult.Accepted,
                requestId: "CNSREQ1",
                items: [
                    {
                        "@type": "AcceptResponseItem",
                        result: ResponseItemResult.Accepted
                    } as ResponseItemJSON
                ]
            } as ResponseJSON)

            it("creates a ResponseWrapper with requestSourceType 'Message'", function () {
                const wrapper = ResponseWrapper.from({
                    requestId: CoreId.from("aCoreId"),
                    requestSourceReference: CoreId.from("aCoreId"),
                    requestSourceType: "Message",
                    response
                })

                expect(wrapper).to.be.instanceOf(ResponseWrapper)
                expect(wrapper.response).to.be.instanceOf(Response)
            })

            it("creates a ResponseWrapper with requestSourceType 'RelationshipTemplate'", function () {
                const wrapper = ResponseWrapper.from({
                    requestId: CoreId.from("aCoreId"),
                    requestSourceReference: CoreId.from("aCoreId"),
                    requestSourceType: "RelationshipTemplate",
                    response
                })

                expect(wrapper).to.be.instanceOf(ResponseWrapper)
                expect(wrapper.response).to.be.instanceOf(Response)
            })

            it("throws when creating a ResponseWrapper with an invalid requestSourceType", function () {
                expect(() =>
                    ResponseWrapper.from({
                        requestId: CoreId.from("aCoreId"),
                        requestSourceReference: CoreId.from("aCoreId"),
                        // @ts-expect-error
                        requestSourceType: "M",
                        response
                    })
                ).to.throw("Value is not within the list of allowed values")
            })
        })
    }
}
