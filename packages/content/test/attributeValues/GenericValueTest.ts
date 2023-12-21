import { SerializableBase } from "@js-soft/ts-serval"
import { AbstractAttributeValue } from "@vermascht/content"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"

export interface GenericValueTestParameters {
    testName: string
    typeName: string
    typeClass: SerializableHelperStatic
    expectedJSON: object
    valueJSON: object
    valueVerboseJSON: object
    valueInterface: object
    valueString?: string
}

abstract class SerializableHelperStatic {
    public abstract fromAny(value: any): SerializableBase
}

export class GenericValueTest extends AbstractTest {
    public run(): void {
        return
    }

    public runParametrized(testParameters: GenericValueTestParameters): void {
        describe(`${testParameters.testName}`, function () {
            if (typeof testParameters.valueString !== "undefined") {
                it("serializes as String", function () {
                    const deserialized = testParameters.typeClass.fromAny(testParameters.valueJSON)
                    expect(deserialized).to.be.instanceOf(AbstractAttributeValue)
                    expect(deserialized).to.be.instanceOf(testParameters.typeClass)
                    expect(`${deserialized}`).to.equal(testParameters.valueString)
                })
            }

            it("deserializes by JSON", function () {
                const deserialized = testParameters.typeClass.fromAny(testParameters.valueJSON)
                expect(deserialized).to.be.instanceOf(AbstractAttributeValue)
                expect(deserialized).to.be.instanceOf(testParameters.typeClass)
                expect(deserialized.toJSON()).to.deep.equal(testParameters.expectedJSON)
            })

            it("deserializes by verbose JSON", function () {
                const deserialized = testParameters.typeClass.fromAny(testParameters.valueVerboseJSON)
                expect(deserialized).to.be.instanceOf(AbstractAttributeValue)
                expect(deserialized).to.be.instanceOf(testParameters.typeClass)
                expect(deserialized.toJSON()).to.deep.equal(testParameters.expectedJSON)
            })

            it("deserializes by Interface", function () {
                const deserialized = testParameters.typeClass.fromAny(testParameters.valueInterface)
                expect(deserialized).to.be.instanceOf(AbstractAttributeValue)
                expect(deserialized).to.be.instanceOf(testParameters.typeClass)
                expect(deserialized.toJSON()).to.deep.equal(testParameters.expectedJSON)
            })
        })
    }
}
