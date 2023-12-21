import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import {
    IThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQueryJSON
} from "@vermascht/content"
import { expect } from "chai"
import itParam from "mocha-param"
import { AbstractTest } from "../AbstractTest"

export interface TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON {
    "@type": "TestTypeContainingThirdPartyRelationshipAttributeQueryTest"
    query: ThirdPartyRelationshipAttributeQueryJSON
}

export interface ITestTypeContainingThirdPartyRelationshipAttributeQueryTest extends ISerializable {
    query: IThirdPartyRelationshipAttributeQuery
}

export class TestTypeContainingThirdPartyRelationshipAttributeQueryTest
    extends Serializable
    implements ITestTypeContainingThirdPartyRelationshipAttributeQueryTest
{
    @serialize()
    @validate()
    public query: ThirdPartyRelationshipAttributeQuery

    public static from(
        value:
            | ITestTypeContainingThirdPartyRelationshipAttributeQueryTest
            | Omit<TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON, "@type">
    ): TestTypeContainingThirdPartyRelationshipAttributeQueryTest {
        return this.fromAny(value)
    }

    public override toJSON(
        verbose?: boolean | undefined,
        serializeAsString?: boolean | undefined
    ): TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON {
        return super.toJSON(
            verbose,
            serializeAsString
        ) as TestTypeContainingThirdPartyRelationshipAttributeQueryTestJSON
    }
}

export class ThirdPartyRelationshipAttributeQueryTest extends AbstractTest {
    public run(): void {
        describe("ThirdPartyRelationshipAttributeQuery", function () {
            itParam(
                "accepts ${JSON.stringify(value.in)} as thirdParty",
                [
                    { in: "test", out: ["test"] },
                    { in: ["test"], out: ["test"] },
                    { in: ["test", "test"], out: ["test", "test"] },
                    { in: { address: "test" }, out: ["test"] },
                    { in: [{ address: "test" }], out: ["test"] },
                    { in: [{ address: "test" }, { address: "test" }], out: ["test", "test"] }
                ],
                function (params) {
                    const serialized = ThirdPartyRelationshipAttributeQuery.from({
                        key: "test",
                        owner: "test",

                        // casting as any to test backwards compatibility
                        thirdParty: params.in as any
                    })

                    expect(serialized).to.be.instanceOf(ThirdPartyRelationshipAttributeQuery)

                    const json = serialized.toJSON()
                    expect(json.thirdParty).to.deep.equal(params.out)
                }
            )

            itParam(
                "throws on ${JSON.stringify(value)} as thirdParty",
                [1, true, null, undefined, [], {}, { address: 1 }],
                function (thirdParty: any) {
                    expect(() => {
                        ThirdPartyRelationshipAttributeQuery.from({
                            key: "test",
                            owner: "test",
                            thirdParty: thirdParty
                        })
                    }).to.throw()
                }
            )

            itParam(
                "(de-)serialize ThirdPartyRelationshipAttributeQuery as a property with ${JSON.stringify(value)} as thirdParty",
                [
                    { in: "test", out: ["test"] },
                    { in: ["test"], out: ["test"] }
                ],
                function (params) {
                    const test = TestTypeContainingThirdPartyRelationshipAttributeQueryTest.from({
                        query: {
                            "@type": "ThirdPartyRelationshipAttributeQuery",
                            key: "test",
                            owner: "test",

                            // casting as any to test backwards compatibility
                            thirdParty: params.in as any
                        }
                    })

                    const json = test.toJSON()
                    expect(json.query).to.deep.equal({
                        key: "test",
                        owner: "test",
                        thirdParty: params.out
                    })
                }
            )
        })
    }
}
