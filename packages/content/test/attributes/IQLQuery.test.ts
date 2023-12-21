import { AttributeValues, IQLQuery, IQLQueryCreationHintsJSON } from "@vermascht/content"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"

export class IQLQueryTest extends AbstractTest {
    public run(): void {
        describe("IQLQuery", function () {
            const validIqlQueries = ["#test", "LanguageCertificate && #language:de"]
            for (const q of validIqlQueries) {
                it(`can be created from valid query string '${q}'`, function () {
                    const serializable = IQLQuery.from({
                        queryString: q
                    })
                    expect(serializable).to.be.instanceOf(IQLQuery)
                })
            }

            const invalidIqlQueries = ["Döner", "$", "( foo "]
            for (const q of invalidIqlQueries) {
                it(`can't be created from invalid query string '${q}'`, function () {
                    expect(() => {
                        IQLQuery.from({
                            queryString: q
                        })
                    }).to.throw()
                })
            }

            it("can be created with creation hints", function () {
                const hint: IQLQueryCreationHintsJSON = {
                    valueType: "ZipCode"
                }

                const serializable = IQLQuery.from({
                    queryString: validIqlQueries[0],
                    attributeCreationHints: hint
                })

                expect(serializable).to.be.instanceOf(IQLQuery)
                expect(serializable.attributeCreationHints?.valueType).to.equal(hint.valueType)
            })

            it("can be created with creation hints that include tags", function () {
                const hint: IQLQueryCreationHintsJSON = {
                    valueType: "GivenName",
                    tags: ["foo", "bar"]
                }

                const serializable = IQLQuery.from({
                    queryString: validIqlQueries[0],
                    attributeCreationHints: hint
                })

                expect(serializable).to.be.instanceOf(IQLQuery)
                expect(serializable.attributeCreationHints?.valueType).to.equal(hint.valueType)
                expect(serializable.attributeCreationHints?.tags).to.deep.equal(hint.tags!)
            })

            it("cannot be created with wrong creation hints", function () {
                const hint = {
                    valueType: "GivenNameABC" as AttributeValues.Identity.TypeName,
                    tags: []
                }

                expect(() => {
                    IQLQuery.from({
                        queryString: validIqlQueries[0],
                        attributeCreationHints: hint
                    })
                }).to.throw("IQLQueryCreationHints.valueType:String :: must be one of:")
            })
        })
    }
}
