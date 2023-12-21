import { AccountController, Transport } from "@vermascht/transport"
import { AbstractTest, TestUtil } from "../../testHelpers"

export class AccountControllerTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("AccountController", function () {
            let transport: Transport

            let account: AccountController
            this.timeout(15000)

            before(async function () {
                transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 1)
                account = accounts[0]
            })

            // eslint-disable-next-line jest/expect-expect
            it("should init a second time", async function () {
                await account.init()
            })

            after(async function () {
                await account.close()
            })
        })
    }
}
