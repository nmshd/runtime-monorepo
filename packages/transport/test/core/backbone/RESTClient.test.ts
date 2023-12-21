import { AccountController, Transport } from "@vermascht/transport"
import { AbstractTest, TestUtil } from "../../testHelpers"

export class RESTClientTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("RESTClientTest", function () {
            let transport: Transport

            let testAccount: AccountController

            this.timeout(150000)

            before(async function () {
                transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 1)
                testAccount = accounts[0]
            })

            after(async function () {
                await testAccount.close()
            })
        })
    }
}
