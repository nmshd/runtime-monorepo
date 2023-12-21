import { CoreBuffer } from "@nmshd/crypto"
import { AccountController, File, Message, Transport } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest, TestUtil } from "../../testHelpers"

export class AttachmentTest extends AbstractTest {
    public run(): void {
        const that = this
        describe("AttachmentTest", function () {
            this.timeout(200000)
            let transport: Transport
            let recipient1: AccountController
            let recipient2: AccountController
            let sender: AccountController
            let file: File
            let file2: File
            let message1: Message
            let message2: Message
            let message3: Message
            let message4: Message
            let content: CoreBuffer
            let content2: CoreBuffer

            before(async function () {
                transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 3)

                content = CoreBuffer.fromUtf8("abcd")
                content2 = CoreBuffer.fromUtf8("dcbadcba")

                recipient1 = accounts[0]
                recipient2 = accounts[1]
                sender = accounts[2]

                await TestUtil.addRelationship(sender, recipient1)
                await TestUtil.addRelationship(sender, recipient2)

                file = await TestUtil.uploadFile(sender, content)
                file2 = await TestUtil.uploadFile(sender, content2)

                message1 = await TestUtil.sendMessageWithFile(sender, recipient1, file)
                message2 = await TestUtil.sendMessageWithFile(sender, recipient2, file)
                message3 = await TestUtil.sendMessagesWithFile(sender, [recipient1, recipient2], file)
                message4 = await TestUtil.sendMessagesWithFiles(sender, [recipient1, recipient2], [file, file2])
            })

            it("should send the correct message to recipient1", function () {
                expect(message1).to.exist
                expect(message1.cache!.attachments).to.have.lengthOf(1)
            })

            it("should sync in recipients until all messages received", async function () {
                const recipient1Messages = await TestUtil.syncUntilHasMessages(recipient1, 3)
                expect(recipient1Messages).to.have.lengthOf(3)

                const recipient2Messages = await TestUtil.syncUntilHasMessages(recipient2, 3)
                expect(recipient2Messages).to.have.lengthOf(3)
            })

            it("should get the correct message for recipient1 (single recipient)", async function () {
                const recipientMessage = await recipient1.messages.getMessage(message1.id)
                expect(recipientMessage).to.exist
                if (!recipientMessage) return
                expect(recipientMessage.cache!.attachments).to.have.lengthOf(1)

                const downloadedContent: CoreBuffer = await recipient1.files.downloadFileContent(
                    recipientMessage.cache!.attachments[0]
                )

                expect(content.toArray()).to.have.members(downloadedContent.toArray())
            })

            it("should get the correct message for recipient1 (multiple recipients)", async function () {
                const recipientMessage = await recipient1.messages.getMessage(message3.id)
                expect(recipientMessage).to.exist
                if (!recipientMessage) return
                expect(recipientMessage.cache!.attachments).to.have.lengthOf(1)

                const downloadedContent: CoreBuffer = await recipient1.files.downloadFileContent(
                    recipientMessage.cache!.attachments[0]
                )

                expect(content.toArray()).to.have.members(downloadedContent.toArray())
            })

            it("should get the correct message for recipient1 (multiple recipients, multiple files)", async function () {
                const recipientMessage = await recipient1.messages.getMessage(message4.id)
                expect(recipientMessage).to.exist
                if (!recipientMessage) return
                expect(recipientMessage.cache!.attachments).to.have.lengthOf(2)

                const downloadedContent: CoreBuffer = await recipient1.files.downloadFileContent(
                    recipientMessage.cache!.attachments[0]
                )

                expect(content.toArray()).to.have.members(downloadedContent.toArray())

                const downloadedContent2: CoreBuffer = await recipient1.files.downloadFileContent(
                    recipientMessage.cache!.attachments[1]
                )

                expect(content2.toArray()).to.have.members(downloadedContent2.toArray())
            })

            it("should get the correct message for recipient2 (single recipient)", async function () {
                const recipientMessage = await recipient2.messages.getMessage(message2.id)
                expect(recipientMessage).to.exist
                if (!recipientMessage) return
                expect(recipientMessage.cache!.attachments).to.have.lengthOf(1)

                const downloadedContent: CoreBuffer = await recipient2.files.downloadFileContent(
                    recipientMessage.cache!.attachments[0]
                )

                expect(content.toArray()).to.have.members(downloadedContent.toArray())
            })

            it("should get the correct message for recipient2 (multiple recipients)", async function () {
                const recipientMessage = await recipient2.messages.getMessage(message3.id)
                expect(recipientMessage).to.exist
                if (!recipientMessage) return
                expect(recipientMessage.cache!.attachments).to.have.lengthOf(1)

                const downloadedContent: CoreBuffer = await recipient2.files.downloadFileContent(
                    recipientMessage.cache!.attachments[0]
                )

                expect(content.toArray()).to.have.members(downloadedContent.toArray())
            })

            it("should get the correct message for recipient2 (multiple recipients, multiple files)", async function () {
                const recipientMessage = await recipient2.messages.getMessage(message4.id)
                expect(recipientMessage).to.exist
                if (!recipientMessage) return
                expect(recipientMessage.cache!.attachments).to.have.lengthOf(2)

                const downloadedContent: CoreBuffer = await recipient2.files.downloadFileContent(
                    recipientMessage.cache!.attachments[0]
                )

                expect(content.toArray()).to.have.members(downloadedContent.toArray())

                const downloadedContent2: CoreBuffer = await recipient2.files.downloadFileContent(
                    recipientMessage.cache!.attachments[1]
                )

                expect(content2.toArray()).to.have.members(downloadedContent2.toArray())
            })

            after(async function () {
                await recipient1.close()
                await recipient2.close()
                await sender.close()
            })
        })
    }
}
