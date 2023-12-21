import { IdentityAttributeQuery } from "@vermascht/content"
import { expect } from "chai"
import itParam from "mocha-param"
import { AbstractTest } from "../AbstractTest"

export class IdentityAttributeQueryTest extends AbstractTest {
    public run(): void {
        describe("IdentityAttributeQuery", function () {
            it("should allow to create a new query", function () {
                const attributeQuery = IdentityAttributeQuery.from({
                    valueType: "StreetAddress",
                    tags: ["Delivery"]
                })
                expect(attributeQuery).to.be.instanceOf(IdentityAttributeQuery)

                const attributeQueryType = IdentityAttributeQuery.from({
                    valueType: "StreetAddress"
                })
                expect(attributeQueryType).to.be.instanceOf(IdentityAttributeQuery)

                const attributeQueryTags = IdentityAttributeQuery.from({
                    valueType: "StreetAddress",
                    tags: ["Delivery"]
                })
                expect(attributeQueryTags).to.be.instanceOf(IdentityAttributeQuery)
            })

            itParam(
                "should validate valueType ('${value}' should be invalid)",
                ["", "non-existing-value-type"],
                function (invalidValueType) {
                    expect(() =>
                        IdentityAttributeQuery.from({
                            // @ts-expect-error
                            valueType: invalidValueType
                        })
                    ).to.throw("IdentityAttributeQuery.valueType:String :: must be one of:")
                }
            )
        })
    }
}
