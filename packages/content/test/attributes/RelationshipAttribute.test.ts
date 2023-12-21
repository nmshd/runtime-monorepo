import { ProprietaryURL, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@vermascht/content"
import { CoreAddress } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"

export class RelationshipAttributeTest extends AbstractTest {
    public run(): void {
        describe("RelationshipAttribute", function () {
            const attributeValue = ProprietaryURL.from({
                title: "Title",
                value: "http://my.url"
            })

            const attributeSerialized = {
                "@type": "ProprietaryURL",
                title: "Title",
                value: "http://my.url"
            }

            function expectValidRelationshipAttribute(value: RelationshipAttribute<ProprietaryURL>): void {
                expect(value).to.be.instanceOf(RelationshipAttribute)
                expect(value.value.toJSON()).to.deep.equal(attributeSerialized)
                expect(value.value).to.be.instanceOf(ProprietaryURL)
            }

            it("should create a RelationshipAttribute (isTechnical: true)", function () {
                const attribute = RelationshipAttribute.from<ProprietaryURL>({
                    key: "aKey",
                    value: attributeValue,
                    owner: CoreAddress.from("address"),
                    isTechnical: true,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                })

                expectValidRelationshipAttribute(attribute)
            })

            it("should create a RelationshipAttribute (isTechnical: false)", function () {
                const attribute = RelationshipAttribute.from<ProprietaryURL>({
                    key: "aKey",
                    value: attributeValue,
                    owner: CoreAddress.from("address"),
                    isTechnical: false,
                    confidentiality: RelationshipAttributeConfidentiality.Public
                })

                expectValidRelationshipAttribute(attribute)
            })

            it("should create a RelationshipAttribute (isTechnical: undefined)", function () {
                const attribute = RelationshipAttribute.from<ProprietaryURL>({
                    key: "aKey",
                    value: attributeValue,
                    owner: CoreAddress.from("address"),
                    confidentiality: RelationshipAttributeConfidentiality.Public
                })

                expectValidRelationshipAttribute(attribute)
            })
        })
    }
}
