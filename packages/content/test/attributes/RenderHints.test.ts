import { RenderHints, StreetAddress } from "@vermascht/content"
import { expect } from "chai"
import { AbstractTest } from "../AbstractTest"

export class RenderHintsTest extends AbstractTest {
    public run(): void {
        describe("RenderHints", function () {
            it("returns propertyHints in case of complex attributes", function () {
                const renderHints = StreetAddress.renderHints

                expect(Object.keys(renderHints.propertyHints)).to.have.lengthOf(7)
            })

            it("correctly serializes complex renderHints", function () {
                const renderHintsJson = StreetAddress.renderHints.toJSON()
                const renderHints = RenderHints.from(renderHintsJson)

                expect(Object.keys(renderHints.propertyHints)).to.have.lengthOf(7)
                expect(renderHints.propertyHints.street).to.be.instanceOf(RenderHints)
            })
        })
    }
}
