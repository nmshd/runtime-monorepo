import { AccountController, CoreDate, CoreId, RelationshipTemplate, Transport } from "@vermascht/transport"
import { expect } from "chai"
import { AbstractTest, TestUtil } from "../../testHelpers"

export class RelationshipTemplateControllerTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("RelationshipTemplateController", function () {
            let transport: Transport

            let sender: AccountController
            let recipient: AccountController
            let tempId1: CoreId
            let tempId2: CoreId
            let tempDate: CoreDate

            this.timeout(150000)

            function expectValidRelationshipTemplates(
                sentRelationshipTemplate: RelationshipTemplate,
                receivedRelationshipTemplate: RelationshipTemplate,
                nowMinusSeconds: CoreDate
            ) {
                expect(sentRelationshipTemplate.id.toString()).equals(receivedRelationshipTemplate.id.toString())
                expect(sentRelationshipTemplate.cache).to.exist
                expect(sentRelationshipTemplate.cachedAt?.isSameOrAfter(nowMinusSeconds)).to.be.true
                expect(sentRelationshipTemplate.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).to.be.true
                expect(receivedRelationshipTemplate.cache).to.exist
                expect(receivedRelationshipTemplate.cachedAt?.isSameOrAfter(nowMinusSeconds)).to.be.true
                expect(receivedRelationshipTemplate.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).to.be.true
                expect(sentRelationshipTemplate.cache!.createdBy.toString()).equals(
                    receivedRelationshipTemplate.cache!.createdBy.toString()
                )
                expect(sentRelationshipTemplate.cache!.identity.address.toString()).equals(
                    receivedRelationshipTemplate.cache!.identity.address.toString()
                )
                expect(JSON.stringify(sentRelationshipTemplate.cache!.content)).equals(
                    JSON.stringify(receivedRelationshipTemplate.cache!.content)
                )
            }

            before(async function () {
                transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 2)
                sender = accounts[0]
                recipient = accounts[1]
            })

            it("should send and receive a RelationshipTemplate", async function () {
                tempDate = CoreDate.utc().subtract(that.tempDateThreshold)
                const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender)

                const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(
                    sentRelationshipTemplate.id,
                    sentRelationshipTemplate.secretKey
                )
                tempId1 = sentRelationshipTemplate.id

                expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate)
            }).timeout(15000)

            it("should get the cached RelationshipTemplate", async function () {
                const sentRelationshipTemplate = await sender.relationshipTemplates.getRelationshipTemplate(tempId1)
                const receivedRelationshipTemplate =
                    await recipient.relationshipTemplates.getRelationshipTemplate(tempId1)
                expect(sentRelationshipTemplate).to.exist
                expect(receivedRelationshipTemplate).to.exist
                expectValidRelationshipTemplates(sentRelationshipTemplate!, receivedRelationshipTemplate!, tempDate)
            })

            it("should send and receive a second RelationshipTemplate", async function () {
                tempDate = CoreDate.utc().subtract(that.tempDateThreshold)
                const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender)

                const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(
                    sentRelationshipTemplate.id,
                    sentRelationshipTemplate.secretKey
                )
                tempId2 = sentRelationshipTemplate.id

                expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate)
            }).timeout(15000)

            it("should send and receive a third RelationshipTemplate", async function () {
                tempDate = CoreDate.utc().subtract(that.tempDateThreshold)
                const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender)

                const receivedRelationshipTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(
                    sentRelationshipTemplate.id,
                    sentRelationshipTemplate.secretKey
                )

                expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate)
            }).timeout(15000)

            it("should get the cached relationshipTemplates", async function () {
                const sentRelationshipTemplates = await sender.relationshipTemplates.getRelationshipTemplates()
                const receivedRelationshipTemplates = await recipient.relationshipTemplates.getRelationshipTemplates()
                expect(sentRelationshipTemplates).to.be.of.length(3)
                expect(receivedRelationshipTemplates).to.be.of.length(3)
                expect(sentRelationshipTemplates[0].id.toString()).equals(tempId1.toString())
                expect(sentRelationshipTemplates[1].id.toString()).equals(tempId2.toString())
                expectValidRelationshipTemplates(
                    sentRelationshipTemplates[0],
                    receivedRelationshipTemplates[0],
                    tempDate
                )
                expectValidRelationshipTemplates(
                    sentRelationshipTemplates[1],
                    receivedRelationshipTemplates[1],
                    tempDate
                )
            })

            it("should create templates with maxNumberOfAllocations=undefined", async function () {
                const ownTemplate = await sender.relationshipTemplates.sendRelationshipTemplate({
                    content: { a: "A" },
                    expiresAt: CoreDate.utc().add({ minutes: 1 }),
                    maxNumberOfAllocations: undefined
                })
                expect(ownTemplate).to.exist

                const peerTemplate = await recipient.relationshipTemplates.loadPeerRelationshipTemplate(
                    ownTemplate.id,
                    ownTemplate.secretKey
                )
                expect(peerTemplate).to.exist
            }).timeout(15000)

            it("should throw an error with maxNumberOfAllocations=0", async function () {
                await TestUtil.expectThrowsAsync(async () => {
                    await sender.relationshipTemplates.sendRelationshipTemplate({
                        content: { a: "A" },
                        expiresAt: CoreDate.utc().add({ minutes: 1 }),
                        maxNumberOfAllocations: 0
                    })
                }, /SendRelationshipTemplateParameters.maxNumberOfAllocations/)
            }).timeout(15000)

            it("should send and receive a RelationshipTemplate using a RelationshipTemplateReference", async function () {
                tempDate = CoreDate.utc().subtract(that.tempDateThreshold)
                const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender)

                const receivedRelationshipTemplate =
                    await recipient.relationshipTemplates.loadPeerRelationshipTemplateByReference(
                        sentRelationshipTemplate.toRelationshipTemplateReference()
                    )

                expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate)
            }).timeout(15000)

            it("should send and receive a RelationshipTemplate using a truncated RelationshipTemplateReference", async function () {
                tempDate = CoreDate.utc().subtract(that.tempDateThreshold)
                const sentRelationshipTemplate = await TestUtil.sendRelationshipTemplate(sender)

                const receivedRelationshipTemplate =
                    await recipient.relationshipTemplates.loadPeerRelationshipTemplateByTruncated(
                        sentRelationshipTemplate.truncate()
                    )

                expectValidRelationshipTemplates(sentRelationshipTemplate, receivedRelationshipTemplate, tempDate)
            }).timeout(15000)

            after(async function () {
                await sender.close()
                await recipient.close()
            })
        })
    }
}
