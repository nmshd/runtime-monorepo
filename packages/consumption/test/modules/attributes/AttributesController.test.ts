import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    ConsumptionController,
    IAttributeSuccessorParams,
    ICreateLocalAttributeParams,
    ICreatePeerLocalAttributeParams,
    ICreateSharedLocalAttributeCopyParams,
    LocalAttribute,
    SharedAttributeCopyCreatedEvent
} from "@vermascht/consumption"
import {
    City,
    Country,
    EMailAddress,
    HouseNumber,
    IIQLQuery,
    IIdentityAttributeQuery,
    IRelationshipAttributeQuery,
    IdentityAttribute,
    Nationality,
    PhoneNumber,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Street,
    ZipCode
} from "@vermascht/content"
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@vermascht/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { MockEventBus } from "../MockEventBus"

export class AttributesControllerTest extends IntegrationTest {
    public run(): void {
        const that = this
        const mockEventBus = new MockEventBus()

        describe("AttributesController", function () {
            const transport = new Transport(that.connection, that.config, mockEventBus, that.loggerFactory)

            let consumptionController: ConsumptionController
            let testAccount: AccountController

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                ;({ accountController: testAccount, consumptionController } = account)
            })

            beforeEach(async function () {
                const emailParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: EMailAddress.from({
                            value: "my@email.address"
                        }),
                        owner: CoreAddress.from("address")
                    })
                }

                const phoneParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: PhoneNumber.from({
                            value: "000000000"
                        }),
                        owner: CoreAddress.from("address")
                    })
                }
                await consumptionController.attributes.createLocalAttribute(emailParams)
                await consumptionController.attributes.createLocalAttribute(phoneParams)

                mockEventBus.clearPublishedEvents()
            })

            after(async function () {
                await testAccount.close()
            })

            afterEach(async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()

                for (const attribute of attributes) {
                    await consumptionController.attributes.deleteAttribute(attribute)
                }
            })

            it("should list all attributes", async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()
                expect(attributes).to.be.of.length(2)
            })

            it("should create new attributes", async function () {
                const attributesBeforeCreate = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesBeforeCreate = attributesBeforeCreate.length

                const birthDateParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "DisplayName",
                            value: "ADisplayName"
                        },
                        owner: CoreAddress.from("address")
                    })
                }

                const birthDate = await consumptionController.attributes.createLocalAttribute(birthDateParams)
                expect(birthDate).instanceOf(LocalAttribute)
                expect(birthDate.content).instanceOf(IdentityAttribute)

                const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesAfterCreate = attributesAfterCreate.length
                expect(nrAttributesAfterCreate).to.equal(nrAttributesBeforeCreate + 1)

                mockEventBus.expectPublishedEvents(AttributeCreatedEvent)
            }).timeout(15000)

            it("should create LocalAttributes for each property of a complex Identity Attribute", async function () {
                const attributesBeforeCreate = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesBeforeCreate = attributesBeforeCreate.length

                const identityAttribute = IdentityAttribute.from({
                    value: {
                        "@type": "StreetAddress",
                        recipient: "ARecipient",
                        street: "AStreet",
                        houseNo: "AHouseNo",
                        zipCode: "AZipCode",
                        city: "ACity",
                        country: "DE"
                    },
                    validTo: CoreDate.utc(),
                    owner: CoreAddress.from("address")
                })

                const address = await consumptionController.attributes.createLocalAttribute({
                    content: identityAttribute
                })

                expect(address).instanceOf(LocalAttribute)
                expect(address.content).instanceOf(IdentityAttribute)

                const childAttributes = await consumptionController.attributes.getLocalAttributes({
                    parentId: address.id.toString()
                })
                expect(childAttributes).to.have.length(5)
                expect(childAttributes[0].content.value).to.be.instanceOf(Street)
                expect(childAttributes[1].content.value).to.be.instanceOf(HouseNumber)
                expect(childAttributes[2].content.value).to.be.instanceOf(ZipCode)
                expect(childAttributes[3].content.value).to.be.instanceOf(City)
                expect(childAttributes[4].content.value).to.be.instanceOf(Country)

                const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesAfterCreate = attributesAfterCreate.length
                expect(nrAttributesAfterCreate).equals(nrAttributesBeforeCreate + 6)
            }).timeout(15000)

            it("should trigger an AttributeCreatedEvent for each created child Attribute of a complex Attribute", async function () {
                await consumptionController.attributes.getLocalAttributes()

                const identityAttribute = IdentityAttribute.from({
                    value: {
                        "@type": "StreetAddress",
                        recipient: "ARecipient",
                        street: "AStreet",
                        houseNo: "AHouseNo",
                        zipCode: "AZipCode",
                        city: "ACity",
                        country: "DE"
                    },
                    validTo: CoreDate.utc(),
                    owner: CoreAddress.from("address")
                })

                await consumptionController.attributes.createLocalAttribute({ content: identityAttribute })

                mockEventBus.expectPublishedEvents(
                    AttributeCreatedEvent,
                    AttributeCreatedEvent,
                    AttributeCreatedEvent,
                    AttributeCreatedEvent,
                    AttributeCreatedEvent,
                    AttributeCreatedEvent
                )
            }).timeout(15000)

            it("should delete an attribute", async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesBeforeDelete = attributes.length
                await consumptionController.attributes.deleteAttribute(attributes[0])

                const attributesAfterDelete = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesAfterDelete = attributesAfterDelete.length
                expect(nrAttributesAfterDelete).equals(nrAttributesBeforeDelete - 1)

                const attributesJSON = attributesAfterDelete.map((v) => v.id.toString())
                expect(attributesJSON).not.to.include(attributes[0]?.id.toString())

                mockEventBus.expectLastPublishedEvent(AttributeDeletedEvent)
            })

            it("should allow to create a share attribute copy", async function () {
                const nationalityParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: testAccount.identity.address
                    })
                }
                const nationalityAttribute =
                    await consumptionController.attributes.createLocalAttribute(nationalityParams)

                const peer = CoreAddress.from("address")
                const createSharedAttributesParams: ICreateSharedLocalAttributeCopyParams = {
                    sourceAttributeId: nationalityAttribute.id,
                    peer: peer,
                    requestReference: CoreId.from("requestId")
                }

                const sharedNationalityAttribute =
                    await consumptionController.attributes.createSharedLocalAttributeCopy(createSharedAttributesParams)
                expect(sharedNationalityAttribute).instanceOf(LocalAttribute)
                expect(sharedNationalityAttribute.shareInfo?.peer).to.deep.equal(peer)

                mockEventBus.expectLastPublishedEvent(SharedAttributeCopyCreatedEvent)
            })

            it("should allow to query public relationship attributes", async function () {
                const relationshipAttributeParams: ICreateLocalAttributeParams = {
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Public
                    })
                }
                await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams)

                const query: IRelationshipAttributeQuery = {
                    key: "customerId",
                    owner: testAccount.identity.address,
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "someHintTitle",
                        confidentiality: "public" as RelationshipAttributeConfidentiality
                    }
                }

                const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query)
                expect(attribute).to.exist
                expect(attribute!.content).to.be.instanceOf(RelationshipAttribute)
                expect((attribute!.content as RelationshipAttribute).key).to.equal("customerId")
            })

            it("should allow to query protected relationship attributes", async function () {
                const relationshipAttributeParams: ICreateLocalAttributeParams = {
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Protected
                    })
                }
                await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams)

                const query: IRelationshipAttributeQuery = {
                    key: "customerId",
                    owner: testAccount.identity.address,
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "someHintTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Protected
                    }
                }

                const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query)
                expect(attribute).to.exist
                expect(attribute!.content).to.be.instanceOf(RelationshipAttribute)
                expect((attribute!.content as RelationshipAttribute).key).to.equal("customerId")
            })

            it("should not allow to query private relationship attributes", async function () {
                const relationshipAttributeParams: ICreateLocalAttributeParams = {
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Private
                    })
                }
                await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams)

                const query: IRelationshipAttributeQuery = {
                    key: "customerId",
                    owner: testAccount.identity.address,
                    attributeCreationHints: {
                        valueType: "ProprietaryString",
                        title: "someHintTitle",
                        confidentiality: RelationshipAttributeConfidentiality.Private
                    }
                }

                const attribute = await consumptionController.attributes.executeRelationshipAttributeQuery(query)
                expect(attribute).to.not.exist
            })

            it("should query relationship attributes using the ThirdPartyRelationshipAttributeQuery", async function () {
                const relationshipAttribute = await consumptionController.attributes.createPeerLocalAttribute({
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Protected
                    }),
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("requestId")
                })

                const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                    key: "customerId",
                    owner: testAccount.identity.address,
                    thirdParty: [CoreAddress.from("peerAddress")]
                })
                expect(attributes).to.have.lengthOf(1)
                expect(attributes[0].id.toString()).to.equal(relationshipAttribute.id.toString())
            })

            it("should not query relationship attributes with confidentiality set to `Private` using the ThirdPartyRelationshipAttributeQuery", async function () {
                await consumptionController.attributes.createPeerLocalAttribute({
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Private
                    }),
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("requestId")
                })

                const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                    key: "customerId",
                    owner: testAccount.identity.address,
                    thirdParty: [CoreAddress.from("peerAddress")]
                })
                expect(attributes).to.have.lengthOf(0)
            })

            it("should not query relationship attributes with not matching key using the ThirdPartyRelationshipAttributeQuery", async function () {
                await consumptionController.attributes.createPeerLocalAttribute({
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer ID"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: RelationshipAttributeConfidentiality.Private
                    }),
                    peer: CoreAddress.from("peerAddress"),
                    requestReference: CoreId.from("requestId")
                })

                const attributes = await consumptionController.attributes.executeThirdPartyRelationshipAttributeQuery({
                    key: "notMatchingKey",
                    owner: testAccount.identity.address,
                    thirdParty: [CoreAddress.from("peerAddress")]
                })
                expect(attributes).to.have.lengthOf(0)
            })

            it("should allow to query identity attributes", async function () {
                const identityAttributeParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: testAccount.identity.address
                    })
                }
                const identityAttribute =
                    await consumptionController.attributes.createLocalAttribute(identityAttributeParams)

                const relationshipAttributeParams: ICreateLocalAttributeParams = {
                    content: RelationshipAttribute.from({
                        key: "customerId",
                        value: {
                            "@type": "ProprietaryString",
                            value: "0815",
                            title: "Customer Id"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: "public" as RelationshipAttributeConfidentiality
                    })
                }
                const relationshipAttribute =
                    await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams)

                const query: IIdentityAttributeQuery = {
                    valueType: "Nationality"
                }

                const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query)
                const attributesId = attributes.map((v) => v.id.toString())
                expect(attributesId).to.not.include(relationshipAttribute.id.toString())
                expect(attributesId).to.include(identityAttribute.id.toString())
            })

            it("should successfully execute IQL queries only with repository attributes", async function () {
                const identityAttributeParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: testAccount.identity.address
                    })
                }
                const identityAttribute =
                    await consumptionController.attributes.createLocalAttribute(identityAttributeParams)
                await consumptionController.attributes.createSharedLocalAttributeCopy({
                    peer: CoreAddress.from("a-fake-peer"),
                    requestReference: CoreId.from("a-fake-reference"),
                    sourceAttributeId: identityAttribute.id,
                    attributeId: CoreId.from("fake-attribute-id")
                })

                const iqlQuery: IIQLQuery = { queryString: "Nationality=DE" }
                const matchedAttributes = await consumptionController.attributes.executeIQLQuery(iqlQuery)
                expect(matchedAttributes).to.be.of.length(1)
                const matchedAttributeIds = matchedAttributes.map((v) => v.id.toString())
                expect(matchedAttributeIds).to.include(identityAttribute.id.toString())
            })

            it("should only return repository attributes on IdentityAttributeQuery", async function () {
                const identityAttributeParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "DisplayName",
                            value: "Dis Play"
                        },
                        owner: testAccount.identity.address
                    })
                }
                const identityAttribute =
                    await consumptionController.attributes.createLocalAttribute(identityAttributeParams)

                const relationshipAttributeParams: ICreateLocalAttributeParams = {
                    content: RelationshipAttribute.from({
                        key: "displayName",
                        value: {
                            "@type": "ProprietaryString",
                            title: "A Title",
                            value: "DE"
                        },
                        owner: testAccount.identity.address,
                        confidentiality: "public" as RelationshipAttributeConfidentiality
                    })
                }
                const relationshipAttribute =
                    await consumptionController.attributes.createLocalAttribute(relationshipAttributeParams)

                const peerAttributeParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "DisplayName",
                            value: "DE"
                        },
                        owner: CoreAddress.from("peer")
                    })
                }
                const peerAttribute = await consumptionController.attributes.createLocalAttribute(peerAttributeParams)

                const sentAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("ref"),
                    sourceAttributeId: identityAttribute.id
                })

                const receivedAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
                    peer: CoreAddress.from("peer"),
                    requestReference: CoreId.from("ref2"),
                    sourceAttributeId: peerAttribute.id,
                    attributeId: CoreId.from("attr1")
                })

                const query: IIdentityAttributeQuery = {
                    valueType: "DisplayName"
                }

                const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query)
                const attributesId = attributes.map((v) => v.id.toString())
                expect(attributes).to.be.of.length(1)
                expect(attributesId).to.not.include(relationshipAttribute.id.toString())
                expect(attributesId).to.not.include(peerAttribute.id.toString())
                expect(attributesId).to.not.include(sentAttribute.id.toString())
                expect(attributesId).to.not.include(receivedAttribute.id.toString())
                expect(attributesId).to.include(identityAttribute.id.toString())
            })

            it("should allow to create an attribute shared by a peer", async function () {
                const attribute: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                const localAttribute = await consumptionController.attributes.createLocalAttribute(attribute)
                const createPeerAttributeParams: ICreatePeerLocalAttributeParams = {
                    id: localAttribute.id,
                    content: attribute.content,
                    requestReference: CoreId.from("requestId"),
                    peer: CoreAddress.from("address")
                }
                const peerLocalAttribute =
                    await consumptionController.attributes.createPeerLocalAttribute(createPeerAttributeParams)
                expect(peerLocalAttribute.content.toJSON()).deep.equals(localAttribute.content.toJSON())
                expect(peerLocalAttribute.content.value).instanceOf(Nationality)
                expect(createPeerAttributeParams.id).equals(localAttribute.id)
                expect(createPeerAttributeParams.peer.address).equals(CoreAddress.from("address").toString())
                expect(createPeerAttributeParams.requestReference.toString()).equals(
                    CoreId.from("requestId").toString()
                )

                mockEventBus.expectLastPublishedEvent(AttributeCreatedEvent)
            })

            describe("Attribute successions", function () {
                describe("Common validator", function () {
                    beforeEach(async function () {
                        const attributes = await consumptionController.attributes.getLocalAttributes()
                        for (const attribute of attributes) {
                            await consumptionController.attributes.deleteAttributeUnsafe(attribute.id)
                        }
                    })

                    it("should catch if the successor attribute already exist, if an explicit id is provided", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            id: CoreId.from("successorId"),
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("differentAddress")
                            })
                        }
                        await consumptionController.attributes.createLocalAttribute(successorData)

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.successorMustNotYetExist"
                        })
                    })

                    it("should catch if the successor is not linked to predecessor, if succeeds is explicitly set", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            }),
                            succeeds: CoreId.from("differentAddress")
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.invalidPredecessor"
                        })
                    })

                    it("should catch if the successor already has a successor itself", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            }),
                            succeededBy: CoreId.from("differentAddress")
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.successorMustNotHaveASuccessor"
                        })
                    })

                    it("should catch if the successor has parent", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            }),
                            parentId: CoreId.from("parentId")
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.cannotSucceedPartOfComplexAttribute"
                        })
                    })

                    it("should catch if the predecessor does not exist", async function () {
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("differentAddress")
                            })
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                CoreId.from("doesntExist"),
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.predecessorDoesNotExist"
                        })
                    })

                    it("should catch if the predecessor already has a successor", async function () {
                        const predecessor = await consumptionController.attributes.createAttributeUnsafe({
                            succeededBy: CoreId.from("successorId"),
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.cannotSucceedAttributesWithASuccessor"
                        })
                    })

                    it("should catch if the predecessor has parent", async function () {
                        const predecessor = await consumptionController.attributes.createAttributeUnsafe({
                            parentId: CoreId.from("parentId"),
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.cannotSucceedPartOfComplexAttribute"
                        })
                    })

                    it("should catch attempted change of owner", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("differentAddress")
                            })
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.successionMustNotChangeOwner"
                        })
                    })

                    it("should catch attempted change of content type", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Citizenship",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: RelationshipAttribute.from({
                                key: "DisplayName",
                                value: {
                                    "@type": "ProprietaryString",
                                    value: "ADisplayName",
                                    title: "Display Name"
                                },
                                owner: CoreAddress.from("address"),
                                confidentiality: RelationshipAttributeConfidentiality.Public
                            })
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.successionMustNotChangeContentType"
                        })
                    })

                    it("should catch attempted change of value type", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "BirthName",
                                    value: "Müller"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorData: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "BirthCountry",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        }

                        const validationResult =
                            await consumptionController.attributes.validateAttributeSuccessionCommon(
                                predecessor.id,
                                successorData
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.successionMustNotChangeValueType"
                        })
                    })
                })

                describe("Validator for own shared identity attribute successions", function () {
                    beforeEach(async function () {
                        const attributes = await consumptionController.attributes.getLocalAttributes()
                        for (const attribute of attributes) {
                            await consumptionController.attributes.deleteAttributeUnsafe(attribute.id)
                        }
                    })

                    it("should catch if the source attributes do not succeed one another", async function () {
                        const predecessorRepo = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Citizenship",
                                    value: "AF"
                                },
                                owner: consumptionController.accountController.identity.address
                            })
                        })

                        const predecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                            sourceAttributeId: predecessorRepo.id,
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRef")
                        })

                        const repoAttribute2 = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Citizenship",
                                    value: "US"
                                },
                                owner: consumptionController.accountController.identity.address
                            })
                        })

                        const successorParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Citizenship",
                                    value: "US"
                                },
                                owner: consumptionController.accountController.identity.address
                            }),
                            shareInfo: {
                                peer: CoreAddress.from("peer"),
                                requestReference: CoreId.from("reqRef2"),
                                sourceAttribute: repoAttribute2.id
                            }
                        }

                        const validationResult =
                            await consumptionController.attributes.validateOwnSharedIdentityAttributeSuccession(
                                predecessor.id,
                                successorParams
                            )
                        expect(validationResult).to.be.an.errorValidationResult({
                            code: "error.consumption.attributes.invalidSuccessionOfOwnSharedIdentityAttribute"
                        })
                    })
                })

                describe("Happy paths for attribute successions", function () {
                    beforeEach(async function () {
                        const attributes = await consumptionController.attributes.getLocalAttributes()
                        for (const attribute of attributes) {
                            await consumptionController.attributes.deleteAttributeUnsafe(attribute.id)
                        }
                    })

                    it("should succeed a repository attribute", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("address")
                            })
                        })
                        const successorParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "US"
                                },
                                owner: CoreAddress.from("address")
                            })
                        }

                        const { predecessor: updatedPredecessor, successor } =
                            await consumptionController.attributes.succeedRepositoryAttribute(
                                predecessor.id,
                                successorParams
                            )
                        expect(successor).to.not.be.undefined
                        expect(updatedPredecessor).to.not.be.undefined
                        expect(predecessor.id.equals(updatedPredecessor.id)).to.be.true
                        expect(updatedPredecessor.succeededBy!.equals(successor.id)).to.be.true
                        expect(successor.succeeds!.equals(updatedPredecessor.id)).to.be.true
                        expect((predecessor.content.value.toJSON() as any).value).to.equal("DE")
                        expect((successor.content.value.toJSON() as any).value).to.equal("US")
                    })

                    it("it should succeed an own shared identity attribute", async function () {
                        const predecessorRepo = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: consumptionController.accountController.identity.address
                            })
                        })
                        const successorRepoParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "US"
                                },
                                owner: consumptionController.accountController.identity.address
                            })
                        }
                        const { successor: successorRepo } =
                            await consumptionController.attributes.succeedRepositoryAttribute(
                                predecessorRepo.id,
                                successorRepoParams
                            )

                        const predecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                            sourceAttributeId: predecessorRepo.id,
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRef")
                        })

                        const successorParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "US"
                                },
                                owner: consumptionController.accountController.identity.address
                            }),
                            shareInfo: {
                                peer: CoreAddress.from("peer"),
                                requestReference: CoreId.from("reqRef2"),
                                sourceAttribute: successorRepo.id
                            }
                        }
                        const { predecessor: updatedPredecessor, successor } =
                            await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                                predecessor.id,
                                successorParams
                            )
                        expect(successor).to.not.be.undefined
                        expect(updatedPredecessor).to.not.be.undefined
                        expect(predecessor.id.equals(updatedPredecessor.id)).to.be.true
                        expect(updatedPredecessor.succeededBy!.equals(successor.id)).to.be.true
                        expect(successor.succeeds!.equals(updatedPredecessor.id)).to.be.true
                        expect(successor.succeeds!.equals(predecessor.id)).to.be.true
                        expect((successor.content.value.toJSON() as any).value).to.equal("US")
                    })

                    it("should succeed a selected own shared identity attribute", async function () {
                        const predecessorRepo = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: consumptionController.accountController.identity.address
                            })
                        })
                        const interimRepoParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "US"
                                },
                                owner: consumptionController.accountController.identity.address
                            })
                        }
                        const successorRepoParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "CZ"
                                },
                                owner: consumptionController.accountController.identity.address
                            })
                        }
                        const { successor: interimRepo } =
                            await consumptionController.attributes.succeedRepositoryAttribute(
                                predecessorRepo.id,
                                interimRepoParams
                            )
                        const { successor: successorRepo } =
                            await consumptionController.attributes.succeedRepositoryAttribute(
                                interimRepo.id,
                                successorRepoParams
                            )

                        const predecessor = await consumptionController.attributes.createSharedLocalAttributeCopy({
                            sourceAttributeId: predecessorRepo.id,
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRef")
                        })

                        const successorParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "CZ"
                                },
                                owner: consumptionController.accountController.identity.address
                            }),
                            shareInfo: {
                                peer: CoreAddress.from("peer"),
                                requestReference: CoreId.from("reqRef2"),
                                sourceAttribute: successorRepo.id
                            }
                        }
                        const { predecessor: updatedPredecessor, successor } =
                            await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                                predecessor.id,
                                successorParams
                            )
                        expect(successor).to.not.be.undefined
                        expect(updatedPredecessor).to.not.be.undefined
                        expect(predecessor.id.equals(updatedPredecessor.id)).to.be.true
                        expect(updatedPredecessor.succeededBy!.equals(successor.id)).to.be.true
                        expect(successor.succeeds!.equals(updatedPredecessor.id)).to.be.true
                        expect(successor.succeeds!.equals(predecessor.id)).to.be.true
                        expect((successor.content.value.toJSON() as any).value).to.equal("CZ")
                    })

                    it("it should succeed a peer shared identity attribute", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "DE"
                                },
                                owner: CoreAddress.from("peer")
                            }),
                            shareInfo: {
                                requestReference: CoreId.from("reqRefA"),
                                peer: CoreAddress.from("peer")
                            }
                        })
                        const successorParams: IAttributeSuccessorParams = {
                            content: IdentityAttribute.from({
                                value: {
                                    "@type": "Nationality",
                                    value: "US"
                                },
                                owner: CoreAddress.from("peer")
                            }),
                            shareInfo: {
                                requestReference: CoreId.from("reqRefB"),
                                peer: CoreAddress.from("peer")
                            }
                        }

                        const { predecessor: updatedPredecessor, successor } =
                            await consumptionController.attributes.succeedPeerSharedIdentityAttribute(
                                predecessor.id,
                                successorParams
                            )
                        expect(successor).to.not.be.undefined
                        expect(updatedPredecessor).to.not.be.undefined
                        expect(predecessor.id.equals(updatedPredecessor.id)).to.be.true
                        expect(updatedPredecessor.succeededBy!.equals(successor.id)).to.be.true
                        expect(successor.succeeds!.equals(updatedPredecessor.id)).to.be.true
                        expect((predecessor.content.value.toJSON() as any).value).to.equal("DE")
                        expect((successor.content.value.toJSON() as any).value).to.equal("US")
                    })

                    it("it should succeed an own shared relationship attribute", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: RelationshipAttribute.from({
                                key: "customerId",
                                value: {
                                    "@type": "ProprietaryString",
                                    value: "0815",
                                    title: "Customer ID"
                                },
                                owner: consumptionController.accountController.identity.address,
                                confidentiality: RelationshipAttributeConfidentiality.Public
                            }),
                            shareInfo: {
                                peer: CoreAddress.from("peerAddress"),
                                requestReference: CoreId.from("reqRefA")
                            }
                        })
                        const successorParams: IAttributeSuccessorParams = {
                            content: RelationshipAttribute.from({
                                key: "customerId",
                                value: {
                                    "@type": "ProprietaryString",
                                    value: "1337",
                                    title: "Customer ID"
                                },
                                owner: consumptionController.accountController.identity.address,
                                confidentiality: RelationshipAttributeConfidentiality.Public
                            }),
                            shareInfo: {
                                peer: CoreAddress.from("peerAddress"),
                                requestReference: CoreId.from("reqRefB")
                            }
                        }

                        const { predecessor: updatedPredecessor, successor } =
                            await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(
                                predecessor.id,
                                successorParams
                            )
                        expect(successor).to.not.be.undefined
                        expect(updatedPredecessor).to.not.be.undefined
                        expect(predecessor.id.equals(updatedPredecessor.id)).to.be.true
                        expect(updatedPredecessor.succeededBy!.equals(successor.id)).to.be.true
                        expect(successor.succeeds!.equals(updatedPredecessor.id)).to.be.true
                        expect((predecessor.content.value.toJSON() as any).value).to.equal("0815")
                        expect((successor.content.value.toJSON() as any).value).to.equal("1337")
                    })

                    it("it should succeed a peer shared relationship attribute", async function () {
                        const predecessor = await consumptionController.attributes.createLocalAttribute({
                            content: RelationshipAttribute.from({
                                key: "customerId",
                                value: {
                                    "@type": "ProprietaryString",
                                    value: "0815",
                                    title: "Customer ID"
                                },
                                owner: CoreAddress.from("peerAddress"),
                                confidentiality: RelationshipAttributeConfidentiality.Public
                            }),
                            shareInfo: {
                                peer: CoreAddress.from("peerAddress"),
                                requestReference: CoreId.from("reqRefA")
                            }
                        })
                        const successorParams: IAttributeSuccessorParams = {
                            content: RelationshipAttribute.from({
                                key: "customerId",
                                value: {
                                    "@type": "ProprietaryString",
                                    value: "1337",
                                    title: "Customer ID"
                                },
                                owner: CoreAddress.from("peerAddress"),
                                confidentiality: RelationshipAttributeConfidentiality.Public
                            }),
                            shareInfo: {
                                peer: CoreAddress.from("peerAddress"),
                                requestReference: CoreId.from("reqRefB")
                            }
                        }

                        const { predecessor: updatedPredecessor, successor } =
                            await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(
                                predecessor.id,
                                successorParams
                            )
                        expect(successor).to.not.be.undefined
                        expect(updatedPredecessor).to.not.be.undefined
                        expect(predecessor.id.equals(updatedPredecessor.id)).to.be.true
                        expect(updatedPredecessor.succeededBy!.equals(successor.id)).to.be.true
                        expect(successor.succeeds!.equals(updatedPredecessor.id)).to.be.true
                        expect((predecessor.content.value.toJSON() as any).value).to.equal("0815")
                        expect((successor.content.value.toJSON() as any).value).to.equal("1337")
                    })
                })
            })

            describe("hideTechnical", function () {
                beforeEach(async function () {
                    await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "notTechnical",
                            value: {
                                "@type": "ProprietaryString",
                                value: "0815",
                                title: "Customer ID"
                            },
                            isTechnical: false,
                            owner: testAccount.identity.address,
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        })
                    })

                    await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "isTechnicalNotDefined",
                            value: {
                                "@type": "ProprietaryString",
                                value: "0815",
                                title: "Customer ID"
                            },
                            owner: testAccount.identity.address,
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        })
                    })

                    await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "technical",
                            value: {
                                "@type": "ProprietaryString",
                                value: "0815",
                                title: "Customer ID"
                            },
                            isTechnical: true,
                            owner: testAccount.identity.address,
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        })
                    })
                })

                it("should hide technical attributes when no query is given", async function () {
                    const attributes = await consumptionController.attributes.getLocalAttributes(undefined, true)
                    expect(attributes.length).to.equal(4)
                })

                it("should hide technical attributes when empty query is given", async function () {
                    const attributes = await consumptionController.attributes.getLocalAttributes({}, true)
                    expect(attributes.length).to.equal(4)
                })
            })

            describe("get versions of attribute", function () {
                it("should return all versions of a possibly succeeded repository attribute", async function () {
                    const version0 = await consumptionController.attributes.createLocalAttribute({
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "DE"
                            },
                            owner: CoreAddress.from("address")
                        })
                    })
                    const successorParams1: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "US"
                            },
                            owner: CoreAddress.from("address")
                        })
                    }
                    const successorParams2: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "CZ"
                            },
                            owner: CoreAddress.from("address")
                        })
                    }

                    const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id)
                    expect(onlyVersion0).to.deep.equal([version0])

                    const { predecessor: updatedVersion0, successor: version1 } =
                        await consumptionController.attributes.succeedRepositoryAttribute(version0.id, successorParams1)
                    const { predecessor: updatedVersion1, successor: version2 } =
                        await consumptionController.attributes.succeedRepositoryAttribute(version1.id, successorParams2)

                    const allVersions = [version2, updatedVersion1, updatedVersion0]

                    for (const version of allVersions) {
                        const result = await consumptionController.attributes.getVersionsOfAttribute(version.id)
                        expect(result).to.deep.equal([version2, updatedVersion1, updatedVersion0])
                    }
                })

                it("should return all versions of a possibly succeeded own shared identity attribute", async function () {
                    const version0Repo = await consumptionController.attributes.createLocalAttribute({
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "DE"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    })
                    const successorParams1Repo: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "US"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    }
                    const successorParams2Repo: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "CZ"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    }

                    const { predecessor: updatedVersion0Repo, successor: version1Repo } =
                        await consumptionController.attributes.succeedRepositoryAttribute(
                            version0Repo.id,
                            successorParams1Repo
                        )
                    const { predecessor: updatedVersion1Repo, successor: version2Repo } =
                        await consumptionController.attributes.succeedRepositoryAttribute(
                            version1Repo.id,
                            successorParams2Repo
                        )

                    const version0A = await consumptionController.attributes.createSharedLocalAttributeCopy({
                        sourceAttributeId: updatedVersion0Repo.id,
                        peer: CoreAddress.from("peerA"),
                        requestReference: CoreId.from("reqRef")
                    })

                    const versionsA = await consumptionController.attributes.getVersionsOfAttribute(version0A.id)
                    expect(versionsA).to.deep.equal([version0A])

                    const version1B = await consumptionController.attributes.createSharedLocalAttributeCopy({
                        sourceAttributeId: updatedVersion1Repo.id,
                        peer: CoreAddress.from("peerB"),
                        requestReference: CoreId.from("reqRef1")
                    })

                    const successorParams2B: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "CZ"
                            },
                            owner: consumptionController.accountController.identity.address
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerB"),
                            requestReference: CoreId.from("reqRef2"),
                            sourceAttribute: version2Repo.id
                        }
                    }

                    const { predecessor: updatedVersion1B, successor: version2B } =
                        await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                            version1B.id,
                            successorParams2B
                        )

                    const allVersions = [version2B, updatedVersion1B]
                    for (const version of allVersions) {
                        const result = await consumptionController.attributes.getVersionsOfAttribute(version.id)
                        expect(result).to.deep.equal(allVersions)
                    }
                })

                it("should return all versions of a possibly succeeded peer shared identity attribute", async function () {
                    const version0 = await consumptionController.attributes.createLocalAttribute({
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "DE"
                            },
                            owner: CoreAddress.from("peer")
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRefA")
                        }
                    })
                    const successorParams1: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "US"
                            },
                            owner: CoreAddress.from("peer")
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            notificationReference: CoreId.from("notRefB")
                        }
                    }
                    const successorParams2: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "CZ"
                            },
                            owner: CoreAddress.from("peer")
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            notificationReference: CoreId.from("notRefC")
                        }
                    }

                    const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id)
                    expect(onlyVersion0).to.deep.equal([version0])

                    const { predecessor: updatedVersion0, successor: version1 } =
                        await consumptionController.attributes.succeedPeerSharedIdentityAttribute(
                            version0.id,
                            successorParams1
                        )
                    const { predecessor: updatedVersion1, successor: version2 } =
                        await consumptionController.attributes.succeedPeerSharedIdentityAttribute(
                            version1.id,
                            successorParams2
                        )

                    const allVersions = [version2, updatedVersion1, updatedVersion0]

                    for (const version of allVersions) {
                        const result = await consumptionController.attributes.getVersionsOfAttribute(version.id)
                        expect(result).to.deep.equal(allVersions)
                    }
                })

                it("should return all versions of a possibly succeeded own shared relationship attribute", async function () {
                    const version0 = await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "customerId",
                            value: {
                                "@type": "ProprietaryString",
                                value: "0815",
                                title: "Customer ID"
                            },
                            owner: consumptionController.accountController.identity.address,
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerAddress"),
                            requestReference: CoreId.from("reqRefA")
                        }
                    })
                    const successorParams1: IAttributeSuccessorParams = {
                        content: RelationshipAttribute.from({
                            key: "customerId",
                            value: {
                                "@type": "ProprietaryString",
                                value: "1337",
                                title: "Customer ID"
                            },
                            owner: consumptionController.accountController.identity.address,
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerAddress"),
                            requestReference: CoreId.from("reqRefB")
                        }
                    }
                    const successorParams2: IAttributeSuccessorParams = {
                        content: RelationshipAttribute.from({
                            key: "customerId",
                            value: {
                                "@type": "ProprietaryString",
                                value: "9999",
                                title: "Customer ID"
                            },
                            owner: consumptionController.accountController.identity.address,
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerAddress"),
                            requestReference: CoreId.from("reqRefC")
                        }
                    }

                    const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id)
                    expect(onlyVersion0).to.deep.equal([version0])

                    const { predecessor: updatedVersion0, successor: version1 } =
                        await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(
                            version0.id,
                            successorParams1
                        )
                    const { predecessor: updatedVersion1, successor: version2 } =
                        await consumptionController.attributes.succeedOwnSharedRelationshipAttribute(
                            version1.id,
                            successorParams2
                        )

                    const allVersions = [version2, updatedVersion1, updatedVersion0]
                    for (const version of allVersions) {
                        const result = await consumptionController.attributes.getVersionsOfAttribute(version.id)
                        expect(result).to.deep.equal(allVersions)
                    }
                })

                it("should return all versions of a possibly succeeded peer shared relationship attribute", async function () {
                    const version0 = await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "customerId",
                            value: {
                                "@type": "ProprietaryString",
                                value: "0815",
                                title: "Customer ID"
                            },
                            owner: CoreAddress.from("peerAddress"),
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerAddress"),
                            requestReference: CoreId.from("reqRefA")
                        }
                    })
                    const successorParams1: IAttributeSuccessorParams = {
                        content: RelationshipAttribute.from({
                            key: "customerId",
                            value: {
                                "@type": "ProprietaryString",
                                value: "1337",
                                title: "Customer ID"
                            },
                            owner: CoreAddress.from("peerAddress"),
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerAddress"),
                            requestReference: CoreId.from("reqRefB")
                        }
                    }
                    const successorParams2: IAttributeSuccessorParams = {
                        content: RelationshipAttribute.from({
                            key: "customerId",
                            value: {
                                "@type": "ProprietaryString",
                                value: "9999",
                                title: "Customer ID"
                            },
                            owner: CoreAddress.from("peerAddress"),
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerAddress"),
                            requestReference: CoreId.from("reqRefC")
                        }
                    }

                    const onlyVersion0 = await consumptionController.attributes.getVersionsOfAttribute(version0.id)
                    expect(onlyVersion0).to.deep.equal([version0])

                    const { predecessor: updatedVersion0, successor: version1 } =
                        await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(
                            version0.id,
                            successorParams1
                        )
                    const { predecessor: updatedVersion1, successor: version2 } =
                        await consumptionController.attributes.succeedPeerSharedRelationshipAttribute(
                            version1.id,
                            successorParams2
                        )

                    const allVersions = [version2, updatedVersion1, updatedVersion0]
                    for (const version of allVersions) {
                        const result = await consumptionController.attributes.getVersionsOfAttribute(version.id)
                        expect(result).to.deep.equal(allVersions)
                    }
                })

                it("should throw if an unassigned attribute id is queried", async function () {
                    await TestUtil.expectThrowsAsync(
                        consumptionController.attributes.getVersionsOfAttribute(CoreId.from("ATTxxxxxxxxxxxxxxxxx")),
                        "error.transport.recordNotFound"
                    )
                })
            })

            describe("get shared versions of a repository attribute", function () {
                let repositoryAttributeV0: LocalAttribute
                let repositoryAttributeV1: LocalAttribute
                let repositoryAttributeV2: LocalAttribute
                let ownSharedIdentityAttributeV1PeerA: LocalAttribute
                let ownSharedIdentityAttributeV1PeerB: LocalAttribute
                let ownSharedIdentityAttributeV2PeerB: LocalAttribute
                beforeEach(async function () {
                    repositoryAttributeV0 = await consumptionController.attributes.createLocalAttribute({
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "DE"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    })
                    const repositoryAttributeParamsV1: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "US"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    }
                    const repositoryAttributeParamsV2: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "CZ"
                            },
                            owner: consumptionController.accountController.identity.address
                        })
                    }

                    ;({ predecessor: repositoryAttributeV0, successor: repositoryAttributeV1 } =
                        await consumptionController.attributes.succeedRepositoryAttribute(
                            repositoryAttributeV0.id,
                            repositoryAttributeParamsV1
                        ))
                    ;({ predecessor: repositoryAttributeV1, successor: repositoryAttributeV2 } =
                        await consumptionController.attributes.succeedRepositoryAttribute(
                            repositoryAttributeV1.id,
                            repositoryAttributeParamsV2
                        ))

                    ownSharedIdentityAttributeV1PeerA =
                        await consumptionController.attributes.createSharedLocalAttributeCopy({
                            sourceAttributeId: repositoryAttributeV1.id,
                            peer: CoreAddress.from("peerA"),
                            requestReference: CoreId.from("reqRef")
                        })

                    ownSharedIdentityAttributeV1PeerB =
                        await consumptionController.attributes.createSharedLocalAttributeCopy({
                            sourceAttributeId: repositoryAttributeV1.id,
                            peer: CoreAddress.from("peerB"),
                            requestReference: CoreId.from("reqRef1")
                        })

                    const ownSharedIdentityAttributeParamsV2PeerB: IAttributeSuccessorParams = {
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "Nationality",
                                value: "CZ"
                            },
                            owner: consumptionController.accountController.identity.address
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerB"),
                            requestReference: CoreId.from("reqRef2"),
                            sourceAttribute: repositoryAttributeV2.id
                        }
                    }

                    ;({ predecessor: ownSharedIdentityAttributeV1PeerB, successor: ownSharedIdentityAttributeV2PeerB } =
                        await consumptionController.attributes.succeedOwnSharedIdentityAttribute(
                            ownSharedIdentityAttributeV1PeerB.id,
                            ownSharedIdentityAttributeParamsV2PeerB
                        ))
                })

                it("should return all shared versions for all peers", async function () {
                    const allRepositoryAttributeVersions = [
                        repositoryAttributeV0,
                        repositoryAttributeV1,
                        repositoryAttributeV2
                    ]
                    const allOwnSharedAttributeVersions = [
                        ownSharedIdentityAttributeV2PeerB,
                        ownSharedIdentityAttributeV1PeerA,
                        ownSharedIdentityAttributeV1PeerB
                    ]
                    for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                        const result1 = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            repositoryAttributeVersion.id,
                            undefined,
                            false
                        )
                        expect(result1).to.deep.equal(allOwnSharedAttributeVersions)

                        const result2 = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            repositoryAttributeVersion.id,
                            [CoreAddress.from("peerA"), CoreAddress.from("peerB")],
                            false
                        )
                        expect(result2).to.deep.equal(allOwnSharedAttributeVersions)
                    }
                })

                it("should return all shared versions for a single peer", async function () {
                    const allRepositoryAttributeVersions = [
                        repositoryAttributeV0,
                        repositoryAttributeV1,
                        repositoryAttributeV2
                    ]
                    const allOwnSharedAttributeVersionsPeerB = [
                        ownSharedIdentityAttributeV2PeerB,
                        ownSharedIdentityAttributeV1PeerB
                    ]
                    for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                        const resultA = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            repositoryAttributeVersion.id,
                            [CoreAddress.from("peerA")],
                            false
                        )
                        expect(resultA).to.deep.equal([ownSharedIdentityAttributeV1PeerA])

                        const resultB = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            repositoryAttributeVersion.id,
                            [CoreAddress.from("peerB")],
                            false
                        )
                        expect(resultB).to.deep.equal(allOwnSharedAttributeVersionsPeerB)
                    }
                })

                it("should return only latest shared versions for all peers", async function () {
                    const allRepositoryAttributeVersions = [
                        repositoryAttributeV0,
                        repositoryAttributeV1,
                        repositoryAttributeV2
                    ]
                    for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                        const result = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            repositoryAttributeVersion.id
                        )
                        expect(result).to.deep.equal([
                            ownSharedIdentityAttributeV2PeerB,
                            ownSharedIdentityAttributeV1PeerA
                        ])
                    }
                })

                it("should return only latest shared version for a single peer", async function () {
                    const allRepositoryAttributeVersions = [
                        repositoryAttributeV0,
                        repositoryAttributeV1,
                        repositoryAttributeV2
                    ]
                    for (const repositoryAttributeVersion of allRepositoryAttributeVersions) {
                        const resultA = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            repositoryAttributeVersion.id,
                            [CoreAddress.from("peerA")]
                        )
                        expect(resultA).to.deep.equal([ownSharedIdentityAttributeV1PeerA])

                        const resultB = await consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            repositoryAttributeVersion.id,
                            [CoreAddress.from("peerB")]
                        )
                        expect(resultB).to.deep.equal([ownSharedIdentityAttributeV2PeerB])
                    }
                })

                it("should throw if an unassigned attribute id is queried", async function () {
                    await TestUtil.expectThrowsAsync(
                        consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            CoreId.from("ATTxxxxxxxxxxxxxxxxx")
                        ),
                        "error.transport.recordNotFound"
                    )
                })

                it("should throw if a shared identity attribute is queried", async function () {
                    const sharedIdentityAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: IdentityAttribute.from({
                            value: {
                                "@type": "DisplayName",
                                value: "Name X"
                            },
                            owner: consumptionController.accountController.identity.address
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peer"),
                            requestReference: CoreId.from("reqRefX")
                        }
                    })

                    await TestUtil.expectThrowsAsync(
                        consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            sharedIdentityAttribute.id
                        ),
                        "error.consumption.attributes.invalidPropertyValue"
                    )
                })

                it("should throw if a relationship attribute is queried", async function () {
                    const relationshipAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "Some key",
                            value: {
                                "@type": "ProprietaryString",
                                value: "Some value",
                                title: "Some title"
                            },
                            owner: consumptionController.accountController.identity.address,
                            confidentiality: RelationshipAttributeConfidentiality.Public
                        }),
                        shareInfo: {
                            peer: CoreAddress.from("peerAddress"),
                            requestReference: CoreId.from("reqRef123")
                        }
                    })

                    await TestUtil.expectThrowsAsync(
                        consumptionController.attributes.getSharedVersionsOfRepositoryAttribute(
                            relationshipAttribute.id
                        ),
                        "error.consumption.attributes.invalidPropertyValue"
                    )
                })
            })
        })
    }
}
