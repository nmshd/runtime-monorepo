import { ValidationError } from "@js-soft/ts-serval"
import { LocalAttributeShareInfo, LocalAttributeShareInfoJSON } from "@vermascht/consumption"
import { expect } from "chai"
import itParam from "mocha-param"
import { UnitTest } from "../../core/UnitTest"

export class LocalAttributeShareInfoTest extends UnitTest {
    public run(): void {
        describe("LocalAttributeShareInfo", function () {
            const validShareInfoJsonParams: LocalAttributeShareInfoJSON[] = [
                {
                    requestReference: "requestReferenceId",
                    peer: "peerAddress",
                    sourceAttribute: "sourceAttributeId"
                },
                {
                    notificationReference: "notificationReferenceId",
                    peer: "peerAddress",
                    sourceAttribute: "sourceAttributeId"
                },
                {
                    requestReference: "requestReferenceId",
                    peer: "peerAddress"
                },
                {
                    notificationReference: "notificationReferenceId",
                    peer: "peerAddress"
                }
            ]
            itParam(
                "should create objects from valid parameters using from()",
                validShareInfoJsonParams,
                function (shareInfoParams: LocalAttributeShareInfoJSON) {
                    const shareInfo = LocalAttributeShareInfo.from(shareInfoParams)
                    expect(shareInfo.requestReference?.toJSON()).to.equal(shareInfoParams.requestReference)
                    expect(shareInfo.notificationReference?.toJSON()).to.equal(shareInfoParams.notificationReference)
                    expect(shareInfo.peer.toJSON()).to.equal(shareInfoParams.peer)
                    expect(shareInfo.sourceAttribute?.toJSON()).to.equal(shareInfoParams.sourceAttribute)
                }
            )

            const invalidShareInfoJsonParams: LocalAttributeShareInfoJSON[] = [
                {
                    notificationReference: "notificationReferenceId",
                    requestReference: "requestReferenceId",
                    peer: "peerAddress"
                },
                {
                    peer: "peerAddress"
                }
            ]
            itParam(
                "should reject invalid parameters when using from()",
                invalidShareInfoJsonParams,
                function (shareInfoParams: LocalAttributeShareInfoJSON) {
                    expect(() => {
                        LocalAttributeShareInfo.from(shareInfoParams)
                    }).to.throw(ValidationError)
                }
            )
        })
    }
}
