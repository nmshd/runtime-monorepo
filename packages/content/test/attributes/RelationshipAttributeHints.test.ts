import {
    RelationshipAttributeConfidentiality,
    RelationshipAttributeCreationHints,
    RelationshipAttributeCreationHintsJSON,
    ValueHints
} from "@vermascht/content"
import { expect } from "chai"
import itParam from "mocha-param"
import { AbstractTest } from "../AbstractTest"

export class RelationshipAttributeHintsTest extends AbstractTest {
    public run(): void {
        describe("RelationshipAttributeHints", function () {
            it("create from interface", function () {
                const creationHints = RelationshipAttributeCreationHints.from({
                    valueType: "ProprietaryString",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    title: "A Title",
                    description: "A Subject",
                    valueHints: ValueHints.from({})
                })
                expect(creationHints).to.be.instanceOf(RelationshipAttributeCreationHints)
            })

            it("create from JSON", function () {
                const creationHintsJSON: RelationshipAttributeCreationHintsJSON = {
                    valueType: "ProprietaryString",
                    confidentiality: RelationshipAttributeConfidentiality.Public,
                    title: "A Title",
                    description: "A Subject",
                    valueHints: { "@type": "ValueHints" }
                }
                const creationHints = RelationshipAttributeCreationHints.from(creationHintsJSON)
                expect(creationHints).to.be.instanceOf(RelationshipAttributeCreationHints)
            })

            itParam(
                "should validate valueType ('${value}' should be invalid)",
                ["", "non-existing-value-type"],
                function (invalidValueType) {
                    expect(() =>
                        RelationshipAttributeCreationHints.from({
                            // @ts-expect-error
                            valueType: invalidValueType,
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            title: "A Title"
                        })
                    ).to.throw("RelationshipAttributeCreationHints.valueType:String :: must be one of:")
                }
            )
        })
    }
}
