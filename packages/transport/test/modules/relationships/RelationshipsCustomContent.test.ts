import { JSONWrapper, Serializable } from "@js-soft/ts-serval"
import { AccountController, RelationshipChangeRequest, Transport } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest, TestUtil } from "../../testHelpers"

export class RelationshipsCustomContentTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("Relationships Custom Content", function () {
            let transport: Transport

            let sender: AccountController
            let recipient: AccountController

            this.timeout(150000)

            before(async function () {
                transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 2)
                sender = accounts[0]
                recipient = accounts[1]
            })

            it("should create a relationship with custom content", async function () {
                const tokenReference = await TestUtil.sendRelationshipTemplateAndToken(sender)
                const template = await TestUtil.fetchRelationshipTemplateFromTokenReference(recipient, tokenReference)
                const customContent = Serializable.fromAny({ content: "TestToken" })
                const relRecipient = await TestUtil.sendRelationship(recipient, template, customContent)
                const relRecipientRequest = relRecipient.cache!.creationChange.request

                const relSender = await TestUtil.syncUntilHasRelationships(sender)
                const relSenderRequest = relSender[0].cache!.creationChange.request

                expect(relRecipientRequest).instanceOf(RelationshipChangeRequest)
                expect(relSenderRequest).instanceOf(RelationshipChangeRequest)

                expect(relRecipientRequest.content).instanceOf(JSONWrapper)
                const recipientToken = relRecipientRequest.content as JSONWrapper
                expect(relSenderRequest.content).instanceOf(JSONWrapper)
                const senderToken = relSenderRequest.content as JSONWrapper

                expect((recipientToken.toJSON() as any).content).equals("TestToken")
                expect((senderToken.toJSON() as any).content).equals("TestToken")
            }).timeout(15000)

            after(async function () {
                await sender.close()
                await recipient.close()
            })
        })
    }
}
