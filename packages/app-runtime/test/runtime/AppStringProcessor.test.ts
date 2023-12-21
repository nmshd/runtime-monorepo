import { Realm } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest } from "../lib"

export class AppStringProcessorTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("AppStringProcessor", function () {
            this.timeout(60000)

            before(async function () {
                await that.createRuntime()
            })

            it("should process a URL", async function () {
                const account = await that.runtime.accountServices.createAccount(
                    Realm.Prod,
                    Math.random().toString(36).substring(7)
                )

                const result = await that.runtime.stringProcessor.processURL("nmshd://qr#", account)
                expect(result.isError).to.be.true

                expect(result.error.code).to.equal("error.appStringProcessor.truncatedReferenceInvalid")
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
