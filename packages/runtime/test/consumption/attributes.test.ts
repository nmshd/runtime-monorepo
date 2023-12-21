import { AttributesController } from "@vermascht/consumption";
import { RelationshipAttributeConfidentiality } from "@vermascht/content";
import { CoreId } from "@vermascht/transport";
import { CreateIdentityAttributeRequest, OwnSharedAttributeSucceededEvent, PeerSharedAttributeSucceededEvent } from "../../src";
import {
    RuntimeServiceProvider,
    TestRuntimeServices,
    ensureActiveRelationship,
    exchangeAndAcceptRequestByMessage,
    executeFullCreateAndShareIdentityAttributeFlow,
    executeFullCreateAndShareRelationshipAttributeFlow,
    executeFullSucceedIdentityAttributeAndNotifyPeerFlow,
    syncUntilHasMessageWithNotification
} from "../lib";

const runtimeServiceProvider = new RuntimeServiceProvider();

let sender: TestRuntimeServices;
let senderAttributeController: AttributesController;
let recipient: TestRuntimeServices;
let recipientAttributeController: AttributesController;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(2, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });

    sender = runtimeServices[0];
    recipient = runtimeServices[1];

    senderAttributeController = (sender.consumption.attributes as any).getAttributeUseCase.attributeController as AttributesController;
    recipientAttributeController = (recipient.consumption.attributes as any).getAttributeUseCase.attributeController as AttributesController;

    await ensureActiveRelationship(sender.transport, recipient.transport);
}, 30000);
afterAll(async () => await runtimeServiceProvider.stop());

beforeEach(() => {
    sender.eventBus.reset();
    recipient.eventBus.reset();
});

describe("Attributes", () => {
    afterEach(async function () {
        const senderAttributesResult = await sender.consumption.attributes.getAttributes({});
        for (const attribute of senderAttributesResult.value) {
            await senderAttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
        }

        const recipientAttributesResult = await recipient.consumption.attributes.getAttributes({});
        for (const attribute of recipientAttributesResult.value) {
            await recipientAttributeController.deleteAttributeUnsafe(CoreId.from(attribute.id));
        }
    });

    test("should list all attributes with empty query", async () => {
        const senderRequests: CreateIdentityAttributeRequest[] = [
            {
                content: {
                    value: {
                        "@type": "Surname",
                        value: "ASurname"
                    }
                }
            },
            {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            }
        ];

        for (const request of senderRequests) {
            const result = await sender.consumption.attributes.createIdentityAttribute(request);
            expect(result.isSuccess).toBe(true);
        }

        const attributes = await sender.consumption.attributes.getAttributes({ query: {} });
        expect(attributes.value).toHaveLength(2);
    });

    test("should hide technical attributes when hideTechnical=true", async () => {
        const senderRequests: CreateIdentityAttributeRequest[] = [
            {
                content: {
                    value: {
                        "@type": "Surname",
                        value: "ASurname"
                    }
                }
            },
            {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            }
        ];

        for (const request of senderRequests) {
            const result = await sender.consumption.attributes.createIdentityAttribute(request);
            expect(result.isSuccess).toBe(true);
        }

        const attribute = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: true
            }
        });

        const getAttributesResponse = await sender.consumption.attributes.getAttributes({ query: {}, hideTechnical: true });
        expect(getAttributesResponse.isSuccess).toBe(true);
        const attributes = getAttributesResponse.value;
        expect(attributes.filter((a) => a.id === attribute.id)).toHaveLength(0);
        expect(attributes).toHaveLength(2);
    });

    test("should return technical attributes when hideTechnical=false", async () => {
        const senderRequests: CreateIdentityAttributeRequest[] = [
            {
                content: {
                    value: {
                        "@type": "Surname",
                        value: "ASurname"
                    }
                }
            },
            {
                content: {
                    value: {
                        "@type": "GivenName",
                        value: "AGivenName"
                    }
                }
            }
        ];

        for (const request of senderRequests) {
            const result = await sender.consumption.attributes.createIdentityAttribute(request);
            expect(result.isSuccess).toBe(true);
        }

        const attribute = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: true
            }
        });

        const getAttributesResponse = await sender.consumption.attributes.getAttributes({ query: {}, hideTechnical: false });
        expect(getAttributesResponse.isSuccess).toBe(true);
        const attributes = getAttributesResponse.value;
        expect(attributes.filter((a) => a.id === attribute.id)).toHaveLength(1);
        expect(attributes).toHaveLength(3);
    });

    test("should return only shared copy on sharedToPeer request", async function () {
        await sender.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "Surname",
                    value: "ASurname"
                }
            }
        });
        const ownSharedIdentityAttribute = await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });

        const result = await sender.consumption.attributes.getOwnSharedAttributes({ peer: recipient.address });
        expect(result).toBeSuccessful();
        const ownSharedAttributes = result.value;
        const ownSharedAttributeIds = ownSharedAttributes.map((a) => a.id);
        expect(ownSharedAttributeIds.sort()).toStrictEqual([ownSharedIdentityAttribute.id, ownSharedRelationshipAttribute.id].sort());
    });

    test("should hide technical shared to peer attributes when hideTechnical=true", async () => {
        await sender.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "Surname",
                    value: "ASurname"
                }
            }
        });
        const ownSharedIdentityAttribute = await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });
        await executeFullCreateAndShareRelationshipAttributeFlow(recipient, sender, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "another String",
                    title: "another title"
                },
                isTechnical: false
            }
        });
        await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: true
            }
        });

        const result = await sender.consumption.attributes.getOwnSharedAttributes({ peer: recipient.address, hideTechnical: true });
        expect(result).toBeSuccessful();
        const ownSharedAttributes = result.value;
        const ownSharedAttributeIds = ownSharedAttributes.map((a) => a.id);
        expect(ownSharedAttributeIds.sort()).toStrictEqual([ownSharedIdentityAttribute.id, ownSharedRelationshipAttribute.id].sort());
    });

    test("should return technical shared to peer attributes when hideTechnical=false", async () => {
        await sender.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "Surname",
                    value: "ASurname"
                }
            }
        });
        const ownSharedIdentityAttribute = await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });
        const technicalOwnSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: true
            }
        });

        const result = await sender.consumption.attributes.getOwnSharedAttributes({ peer: recipient.address, hideTechnical: false });
        expect(result).toBeSuccessful();
        const ownSharedAttributes = result.value;
        const ownSharedAttributeIds = ownSharedAttributes.map((a) => a.id);
        expect(ownSharedAttributeIds.sort()).toStrictEqual([ownSharedIdentityAttribute.id, ownSharedRelationshipAttribute.id, technicalOwnSharedRelationshipAttribute.id].sort());
    });

    test("should return only latest shared versions of own shared attributes", async function () {
        let ownSharedIdentityAttributeV0 = await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });

        const repositoryAttributeIdV0 = ownSharedIdentityAttributeV0.shareInfo!.sourceAttribute!;
        const succeedIdentityAttributeAndNotifyPeerResult = await executeFullSucceedIdentityAttributeAndNotifyPeerFlow(sender, recipient, {
            predecessorId: repositoryAttributeIdV0,
            successorContent: {
                value: {
                    "@type": "Nationality",
                    value: "US"
                }
            }
        });

        ownSharedIdentityAttributeV0 = succeedIdentityAttributeAndNotifyPeerResult["predecessor"];
        const ownSharedIdentityAttributeV1 = succeedIdentityAttributeAndNotifyPeerResult["successor"];

        let ownSharedRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });

        const succeedRelationshipAttributeResult = (
            await sender.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: ownSharedRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "another String",
                        title: "another title"
                    }
                }
            })
        ).value;
        ownSharedRelationshipAttributeV0 = succeedRelationshipAttributeResult["predecessor"];
        const ownSharedRelationshipAttributeV1 = succeedRelationshipAttributeResult["successor"];

        await syncUntilHasMessageWithNotification(recipient.transport, succeedRelationshipAttributeResult["notificationId"]);

        await sender.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.successor.id === ownSharedRelationshipAttributeV1.id;
        });

        const result = await sender.consumption.attributes.getOwnSharedAttributes({ peer: recipient.address });
        expect(result).toBeSuccessful();
        const ownSharedAttributes = result.value;
        expect(ownSharedAttributes).toStrictEqual([ownSharedIdentityAttributeV1, ownSharedRelationshipAttributeV1]);
    });

    test("should return all shared version of own shared attributes", async function () {
        let ownSharedIdentityAttributeV0 = await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });

        const repositoryAttributeIdV0 = ownSharedIdentityAttributeV0.shareInfo!.sourceAttribute!;
        const succeedIdentityAttributeAndNotifyPeerResult = await executeFullSucceedIdentityAttributeAndNotifyPeerFlow(sender, recipient, {
            predecessorId: repositoryAttributeIdV0,
            successorContent: {
                value: {
                    "@type": "Nationality",
                    value: "US"
                }
            }
        });

        ownSharedIdentityAttributeV0 = succeedIdentityAttributeAndNotifyPeerResult["predecessor"];
        const ownSharedIdentityAttributeV1 = succeedIdentityAttributeAndNotifyPeerResult["successor"];

        let ownSharedRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });

        const succeedRelationshipAttributeResult = (
            await sender.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: ownSharedRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "another String",
                        title: "another title"
                    }
                }
            })
        ).value;

        ownSharedRelationshipAttributeV0 = succeedRelationshipAttributeResult["predecessor"];
        const ownSharedRelationshipAttributeV1 = succeedRelationshipAttributeResult["successor"];

        await syncUntilHasMessageWithNotification(recipient.transport, succeedRelationshipAttributeResult["notificationId"]);

        await sender.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.successor.id === ownSharedRelationshipAttributeV1.id;
        });

        const result = await sender.consumption.attributes.getOwnSharedAttributes({ peer: recipient.address, onlyLatestVersions: false });
        expect(result).toBeSuccessful();
        const ownSharedAttributes = result.value;
        expect(ownSharedAttributes).toStrictEqual([ownSharedIdentityAttributeV0, ownSharedIdentityAttributeV1, ownSharedRelationshipAttributeV0, ownSharedRelationshipAttributeV1]);
    });

    test("should allow to get an attribute by id", async function () {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        };
        const attribute = (await sender.consumption.attributes.createIdentityAttribute(createAttributeRequest)).value;

        const result = await sender.consumption.attributes.getAttribute({ id: attribute.id });
        expect(result.isSuccess).toBe(true);
        const receivedAttribute = result.value;
        expect(receivedAttribute).toStrictEqual(attribute);
    });

    test("should allow to get an attribute by type", async function () {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "EMailAddress",
                    value: "a.mailaddress@provider.com"
                }
            }
        };
        const attribute = (await sender.consumption.attributes.createIdentityAttribute(createAttributeRequest)).value;

        const result = await sender.consumption.attributes.getAttributes({
            query: { "content.value.@type": "EMailAddress" }
        });
        expect(result).toBeSuccessful();
        const receivedAttributes = result.value;
        expect(receivedAttributes).toHaveLength(1);
        expect(receivedAttributes[0]).toStrictEqual(attribute);
    });

    test("should allow to execute an identityAttributeQuery", async function () {
        const createIdentityAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "PhoneNumber",
                    value: "012345678910"
                }
            }
        };
        const repositoryAttribute = (await sender.consumption.attributes.createIdentityAttribute(createIdentityAttributeRequest)).value;

        await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "ProprietaryString",
                    title: "aTitle",
                    value: "aProprietaryStringValue"
                },
                key: "phone",
                confidentiality: RelationshipAttributeConfidentiality.Protected
            }
        });

        const result = await sender.consumption.attributes.executeIdentityAttributeQuery({ query: { "@type": "IdentityAttributeQuery", valueType: "PhoneNumber" } });
        expect(result.isSuccess).toBe(true);
        const receivedAttributes = result.value;
        const receivedAttributeIds = receivedAttributes.map((e) => e.id);
        expect(receivedAttributeIds.sort()).toStrictEqual([repositoryAttribute.id]);
    });

    test("should allow to execute a relationshipAttributeQuery", async function () {
        await sender.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "PhoneNumber",
                    value: "012345678910"
                }
            }
        });
        const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "ProprietaryString",
                    title: "aTitle",
                    value: "aProprietaryStringValue"
                },
                key: "website",
                confidentiality: RelationshipAttributeConfidentiality.Protected
            }
        });

        const result = await sender.consumption.attributes.executeRelationshipAttributeQuery({
            query: {
                "@type": "RelationshipAttributeQuery",
                key: "website",
                owner: sender.address,
                attributeCreationHints: { valueType: "ProprietaryString", title: "AnAttributeHint", confidentiality: RelationshipAttributeConfidentiality.Protected }
            }
        });
        expect(result.isSuccess).toBe(true);
        const receivedAttribute = result.value;
        expect(receivedAttribute.id).toStrictEqual(ownSharedRelationshipAttribute.id);
    });

    test("should allow to execute a thirdPartyRelationshipAttributeQuery", async function () {
        await exchangeAndAcceptRequestByMessage(
            sender,
            recipient,
            {
                peer: recipient.address,
                content: {
                    items: [
                        {
                            "@type": "CreateAttributeRequestItem",
                            attribute: {
                                "@type": "RelationshipAttribute",
                                value: {
                                    "@type": "ProprietaryString",
                                    title: "aTitle",
                                    value: "aProprietaryStringValue"
                                },
                                key: "website",
                                confidentiality: RelationshipAttributeConfidentiality.Public,
                                owner: sender.address
                            },
                            mustBeAccepted: true
                        }
                    ]
                }
            },
            [{ accept: true }]
        );

        const receivedAttribute = await recipient.consumption.attributes.executeThirdPartyRelationshipAttributeQuery({
            query: {
                "@type": "ThirdPartyRelationshipAttributeQuery",
                key: "website",
                owner: sender.address,
                thirdParty: [sender.address]
            }
        });
        expect(receivedAttribute).toBeSuccessful();
        expect(receivedAttribute.value).toHaveLength(1);
    });

    test("getPeerSharedAttributes should hide technical peer attributes when hideTechnical=true", async () => {
        await sender.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "Surname",
                    value: "ASurname"
                }
            }
        });
        await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });
        const peerSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(recipient, sender, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "another String",
                    title: "another title"
                },
                isTechnical: false
            }
        });
        await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: true
            }
        });

        const result = await sender.consumption.attributes.getPeerSharedAttributes({ peer: recipient.address, hideTechnical: true });
        expect(result).toBeSuccessful();
        const peerSharedAttributes = result.value;
        const ownSharedAttributeIds = peerSharedAttributes.map((a) => a.id);
        expect(ownSharedAttributeIds.sort()).toStrictEqual([peerSharedRelationshipAttribute.id]);
    });

    test("getPeerSharedAttributes should return technical peer attributes when hideTechnical=false", async () => {
        await sender.consumption.attributes.createIdentityAttribute({
            content: {
                value: {
                    "@type": "Surname",
                    value: "ASurname"
                }
            }
        });
        await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });
        await executeFullCreateAndShareRelationshipAttributeFlow(sender, recipient, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });
        const peerSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(recipient, sender, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "another String",
                    title: "another title"
                },
                isTechnical: false
            }
        });
        const technicalPeerSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(recipient, sender, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: true
            }
        });

        const result = await sender.consumption.attributes.getPeerSharedAttributes({ peer: recipient.address, hideTechnical: false });
        expect(result).toBeSuccessful();
        const peerSharedAttributes = result.value;
        const peerSharedAttributeIds = peerSharedAttributes.map((a) => a.id);
        expect(peerSharedAttributeIds.sort()).toStrictEqual([peerSharedRelationshipAttribute.id, technicalPeerSharedRelationshipAttribute.id].sort());
    });

    test("getPeerSharedAttributes should return only the latest versions", async () => {
        let peerSharedIdentityAttributeV0 = await executeFullCreateAndShareIdentityAttributeFlow(recipient, sender, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });

        const peerRepositoryAttributeIdV0 = peerSharedIdentityAttributeV0.shareInfo!.sourceAttribute!;
        const succeedIdentityAttributeAndNotifyPeerResult = await executeFullSucceedIdentityAttributeAndNotifyPeerFlow(recipient, sender, {
            predecessorId: peerRepositoryAttributeIdV0,
            successorContent: {
                value: {
                    "@type": "Nationality",
                    value: "US"
                }
            }
        });

        peerSharedIdentityAttributeV0 = succeedIdentityAttributeAndNotifyPeerResult["predecessor"];
        const peerSharedIdentityAttributeV1 = succeedIdentityAttributeAndNotifyPeerResult["successor"];

        let peerSharedRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(recipient, sender, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });

        const succeedRelationshipAttributeResult = (
            await recipient.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: peerSharedRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "another String",
                        title: "another title"
                    }
                }
            })
        ).value;

        peerSharedRelationshipAttributeV0 = succeedRelationshipAttributeResult["predecessor"];
        const peerSharedRelationshipAttributeV1 = succeedRelationshipAttributeResult["successor"];

        await syncUntilHasMessageWithNotification(sender.transport, succeedRelationshipAttributeResult["notificationId"]);

        await sender.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.successor.id === peerSharedRelationshipAttributeV1.id;
        });

        const result = await sender.consumption.attributes.getPeerSharedAttributes({ peer: recipient.address });
        expect(result).toBeSuccessful();
        const peerSharedAttributes = result.value;
        const peerSharedAttributeIds = peerSharedAttributes.map((a) => a.id);
        expect(peerSharedAttributeIds.sort()).toStrictEqual([peerSharedIdentityAttributeV1.id, peerSharedRelationshipAttributeV1.id].sort());
    });

    test("getPeerSharedAttributes should return all versions", async () => {
        let peerSharedIdentityAttributeV0 = await executeFullCreateAndShareIdentityAttributeFlow(recipient, sender, {
            content: {
                value: {
                    "@type": "Nationality",
                    value: "DE"
                }
            }
        });

        const peerRepositoryAttributeIdV0 = peerSharedIdentityAttributeV0.shareInfo!.sourceAttribute!;
        const succeedIdentityAttributeAndNotifyPeerResult = await executeFullSucceedIdentityAttributeAndNotifyPeerFlow(recipient, sender, {
            predecessorId: peerRepositoryAttributeIdV0,
            successorContent: {
                value: {
                    "@type": "Nationality",
                    value: "US"
                }
            }
        });

        peerSharedIdentityAttributeV0 = succeedIdentityAttributeAndNotifyPeerResult["predecessor"];
        const peerSharedIdentityAttributeV1 = succeedIdentityAttributeAndNotifyPeerResult["successor"];

        let peerSharedRelationshipAttributeV0 = await executeFullCreateAndShareRelationshipAttributeFlow(recipient, sender, {
            content: {
                key: "a key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                isTechnical: false
            }
        });

        const succeedRelationshipAttributeResult = (
            await recipient.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
                predecessorId: peerSharedRelationshipAttributeV0.id,
                successorContent: {
                    value: {
                        "@type": "ProprietaryString",
                        value: "another String",
                        title: "another title"
                    }
                }
            })
        ).value;

        peerSharedRelationshipAttributeV0 = succeedRelationshipAttributeResult["predecessor"];
        const peerSharedRelationshipAttributeV1 = succeedRelationshipAttributeResult["successor"];

        await syncUntilHasMessageWithNotification(sender.transport, succeedRelationshipAttributeResult["notificationId"]);

        await sender.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.successor.id === peerSharedRelationshipAttributeV1.id;
        });

        const result = await sender.consumption.attributes.getPeerSharedAttributes({ peer: recipient.address, onlyLatestVersions: false });
        expect(result).toBeSuccessful();
        const peerSharedAttributes = result.value;
        const peerSharedAttributeIds = peerSharedAttributes.map((a) => a.id);
        expect(peerSharedAttributeIds.sort()).toStrictEqual(
            [peerSharedIdentityAttributeV0.id, peerSharedIdentityAttributeV1.id, peerSharedRelationshipAttributeV0.id, peerSharedRelationshipAttributeV1.id].sort()
        );
    });

    test("get only latest version of own identity attributes", async () => {
        let repoSurnameV0 = (
            await sender.consumption.attributes.createIdentityAttribute({
                content: {
                    value: {
                        "@type": "Surname",
                        value: "A surname"
                    }
                }
            })
        ).value;

        const surnameSuccessionResult = (
            await sender.consumption.attributes.succeedIdentityAttribute({
                predecessorId: repoSurnameV0.id,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Another surname"
                    }
                }
            })
        ).value;
        repoSurnameV0 = surnameSuccessionResult["predecessor"];
        const repoSurnameV1 = surnameSuccessionResult["successor"];

        const ownSharedGivenNameV0 = await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "A given name"
                }
            }
        });
        let repoGivenNameV0 = (await sender.consumption.attributes.getAttribute({ id: ownSharedGivenNameV0.shareInfo!.sourceAttribute! })).value;

        const givenNameSuccessionResult = (
            await sender.consumption.attributes.succeedIdentityAttribute({
                predecessorId: repoGivenNameV0.id,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "Another given name"
                    }
                }
            })
        ).value;
        repoGivenNameV0 = givenNameSuccessionResult["predecessor"];
        const repoGivenNameV1 = givenNameSuccessionResult["successor"];

        const { notificationId } = (await sender.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({ attributeId: repoGivenNameV1.id, peer: recipient.address }))
            .value;

        await syncUntilHasMessageWithNotification(recipient.transport, notificationId);

        const result = await sender.consumption.attributes.getOwnIdentityAttributes({});
        expect(result).toBeSuccessful();
        const ownIdentityAttributes = result.value;
        expect(ownIdentityAttributes).toStrictEqual([repoSurnameV1, repoGivenNameV1]);
    });

    test("get all versions of own identity attributes", async () => {
        let repoSurnameV0 = (
            await sender.consumption.attributes.createIdentityAttribute({
                content: {
                    value: {
                        "@type": "Surname",
                        value: "A surname"
                    }
                }
            })
        ).value;

        const surnameSuccessionResult = (
            await sender.consumption.attributes.succeedIdentityAttribute({
                predecessorId: repoSurnameV0.id,
                successorContent: {
                    value: {
                        "@type": "Surname",
                        value: "Another surname"
                    }
                }
            })
        ).value;
        repoSurnameV0 = surnameSuccessionResult["predecessor"];
        const repoSurnameV1 = surnameSuccessionResult["successor"];

        const ownSharedGivenNameV0 = await executeFullCreateAndShareIdentityAttributeFlow(sender, recipient, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "A given name"
                }
            }
        });
        let repoGivenNameV0 = (await sender.consumption.attributes.getAttribute({ id: ownSharedGivenNameV0.shareInfo!.sourceAttribute! })).value;

        const givenNameSuccessionResult = (
            await sender.consumption.attributes.succeedIdentityAttribute({
                predecessorId: repoGivenNameV0.id,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "Another given name"
                    }
                }
            })
        ).value;
        repoGivenNameV0 = givenNameSuccessionResult["predecessor"];
        const repoGivenNameV1 = givenNameSuccessionResult["successor"];

        const { notificationId } = (await sender.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({ attributeId: repoGivenNameV1.id, peer: recipient.address }))
            .value;

        await syncUntilHasMessageWithNotification(recipient.transport, notificationId);

        const result = await sender.consumption.attributes.getOwnIdentityAttributes({ onlyLatestVersions: false });
        expect(result).toBeSuccessful();
        const ownIdentityAttributes = result.value;
        expect(ownIdentityAttributes).toStrictEqual([repoSurnameV0, repoSurnameV1, repoGivenNameV0, repoGivenNameV1]);
    });
});
