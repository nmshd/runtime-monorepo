import { expect } from "chai"
import { AbstractTest, FakeUIBridge } from "../lib"

export class UIBridgeTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("UIBridge", function () {
            this.timeout(60000)

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()
            })

            it("returns the same UIBridge for concurrent calls", async function () {
                const promises = [that.runtime.uiBridge(), that.runtime.uiBridge()]

                that.runtime.registerUIBridge(new FakeUIBridge())

                const results = await Promise.all(promises)
                for (const bridge of results) expect(bridge).to.be.instanceOf(FakeUIBridge)
            })

            it("returns a UIBridge for subsequent calls", async function () {
                const bridge = await that.runtime.uiBridge()
                expect(bridge).to.be.instanceOf(FakeUIBridge)
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
