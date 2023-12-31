import { LocalRequestStatus } from "@vermascht/consumption";
import { CityJSON, CountryJSON, HouseNumberJSON, RelationshipAttributeConfidentiality, StreetJSON, ZipCodeJSON } from "@vermascht/content";
import { CoreId } from "@vermascht/transport";
import {
    AttributeCreatedEvent,
    CreateAndShareRelationshipAttributeRequest,
    CreateAndShareRelationshipAttributeUseCase,
    CreateIdentityAttributeRequest,
    CreateIdentityAttributeUseCase,
    IncomingRequestStatusChangedEvent,
    LocalAttributeDTO,
    NotifyPeerAboutIdentityAttributeSuccessionUseCase,
    OutgoingRequestStatusChangedEvent,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeSucceededEvent,
    RepositoryAttributeSucceededEvent,
    ShareIdentityAttributeRequest,
    ShareIdentityAttributeUseCase,
    SucceedIdentityAttributeRequest,
    SucceedIdentityAttributeUseCase,
    SucceedRelationshipAttributeAndNotifyPeerUseCase
} from "../../src";
import {
    RuntimeServiceProvider,
    TestRuntimeServices,
    ensureActiveRelationship,
    executeFullCreateAndShareIdentityAttributeFlow,
    executeFullCreateAndShareRelationshipAttributeFlow,
    syncUntilHasMessageWithNotification,
    syncUntilHasMessageWithRequest,
    syncUntilHasMessageWithResponse
} from "../lib";

/* Disable timeout errors if we're debugging */
if (process.env.NODE_OPTIONS !== undefined && process.env.NODE_OPTIONS.search("inspect") !== -1) {
    jest.setTimeout(1e9);
}

const runtimeServiceProvider = new RuntimeServiceProvider();

let services1: TestRuntimeServices;
let services2: TestRuntimeServices;
let services3: TestRuntimeServices;

beforeAll(async () => {
    const runtimeServices = await runtimeServiceProvider.launch(3, { enableRequestModule: true, enableDeciderModule: true, enableNotificationModule: true });

    services1 = runtimeServices[0];
    services2 = runtimeServices[1];
    services3 = runtimeServices[2];

    await ensureActiveRelationship(services1.transport, services2.transport);
    await ensureActiveRelationship(services1.transport, services3.transport);
    await ensureActiveRelationship(services2.transport, services3.transport);

    // exchange IdentityAttibutes between all clients
    await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
        content: {
            value: {
                "@type": "DisplayName",
                value: "Client 1"
            }
        }
    });
    await executeFullCreateAndShareIdentityAttributeFlow(services1, services3, {
        content: {
            value: {
                "@type": "DisplayName",
                value: "Client 1"
            }
        }
    });
    await executeFullCreateAndShareIdentityAttributeFlow(services2, services1, {
        content: {
            value: {
                "@type": "DisplayName",
                value: "Client 2"
            }
        }
    });
    await executeFullCreateAndShareIdentityAttributeFlow(services2, services3, {
        content: {
            value: {
                "@type": "DisplayName",
                value: "Client 2"
            }
        }
    });
    await executeFullCreateAndShareIdentityAttributeFlow(services3, services1, {
        content: {
            value: {
                "@type": "DisplayName",
                value: "Client 3"
            }
        }
    });
    await executeFullCreateAndShareIdentityAttributeFlow(services3, services2, {
        content: {
            value: {
                "@type": "DisplayName",
                value: "Client 3"
            }
        }
    });

    // exchange IdentityAttribute between some clients
    const mailClient1 = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
        content: {
            value: {
                "@type": "EMailAddress",
                value: "Client1@mail.com"
            }
        }
    });
    const mailClient2 = await executeFullCreateAndShareIdentityAttributeFlow(services2, services3, {
        content: {
            value: {
                "@type": "EMailAddress",
                value: "Client2@mail.com"
            }
        }
    });
    const mailClient3 = await executeFullCreateAndShareIdentityAttributeFlow(services3, services1, {
        content: {
            value: {
                "@type": "EMailAddress",
                value: "Client3@mail.com"
            }
        }
    });

    // succeed some IdentityAttributes
    const { successor: succeededMailClient1 } = (
        await services1.consumption.attributes.succeedIdentityAttribute({
            predecessorId: mailClient1.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "EMailAddress",
                    value: "Client1New@mail.com"
                }
            }
        })
    ).value;
    await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
        peer: services2.address,
        attributeId: succeededMailClient1.id
    });

    await services2.consumption.attributes.succeedIdentityAttribute({
        predecessorId: mailClient2.shareInfo!.sourceAttribute!,
        successorContent: {
            value: {
                "@type": "EMailAddress",
                value: "Client2New@mail.com"
            }
        }
    });

    const { successor: succeededMailClient3 } = (
        await services3.consumption.attributes.succeedIdentityAttribute({
            predecessorId: mailClient3.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "EMailAddress",
                    value: "Client3New@mail.com"
                }
            }
        })
    ).value;
    const { successor: twiceSucceededMailClient3 } = (
        await services3.consumption.attributes.succeedIdentityAttribute({
            predecessorId: succeededMailClient3.id,
            successorContent: {
                value: {
                    "@type": "EMailAddress",
                    value: "Client3NewNew@mail.com"
                }
            }
        })
    ).value;
    await services3.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
        peer: services1.address,
        attributeId: twiceSucceededMailClient3.id
    });

    // create RelationshipAttributes for all client pairs
    const relationshipAttributeClient12 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
        content: {
            key: "work phone",
            value: {
                "@type": "ProprietaryPhoneNumber",
                title: "Work phone",
                value: "012302"
            },
            confidentiality: RelationshipAttributeConfidentiality.Public
        }
    });
    await executeFullCreateAndShareRelationshipAttributeFlow(services1, services3, {
        content: {
            key: "work phone",
            value: {
                "@type": "ProprietaryPhoneNumber",
                title: "Work phone",
                value: "012303"
            },
            confidentiality: RelationshipAttributeConfidentiality.Public
        }
    });

    await executeFullCreateAndShareRelationshipAttributeFlow(services2, services1, {
        content: {
            key: "emergency phone",
            value: {
                "@type": "ProprietaryPhoneNumber",
                title: "Emergency phone",
                value: "011102"
            },
            confidentiality: RelationshipAttributeConfidentiality.Private
        }
    });
    const relationshipAttributeClient23 = await executeFullCreateAndShareRelationshipAttributeFlow(services2, services3, {
        content: {
            key: "emergency phone",
            value: {
                "@type": "ProprietaryPhoneNumber",
                title: "Emergency phone",
                value: "011103"
            },
            confidentiality: RelationshipAttributeConfidentiality.Private
        }
    });
    const relationshipAttributeClient31 = await executeFullCreateAndShareRelationshipAttributeFlow(services3, services1, {
        content: {
            key: "client number",
            value: {
                "@type": "ProprietaryInteger",
                title: "Client Number",
                value: 31
            },
            confidentiality: RelationshipAttributeConfidentiality.Private
        }
    });
    await executeFullCreateAndShareRelationshipAttributeFlow(services3, services2, {
        content: {
            key: "client number",
            value: {
                "@type": "ProprietaryInteger",
                title: "Client Number",
                value: 32
            },
            confidentiality: RelationshipAttributeConfidentiality.Private
        }
    });

    // succeed some RelationshipAttributes
    await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
        predecessorId: relationshipAttributeClient12.id,
        successorContent: {
            value: {
                "@type": "ProprietaryPhoneNumber",
                title: "Work phone",
                value: "0123020"
            }
        }
    });
    await services2.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
        predecessorId: relationshipAttributeClient23.id,
        successorContent: {
            value: {
                "@type": "ProprietaryPhoneNumber",
                title: "Emergency phone new",
                value: "0111010"
            }
        }
    });
    const { successor: succeededRelationshipAttributeClient31 } = (
        await services3.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: relationshipAttributeClient31.id,
            successorContent: {
                value: {
                    "@type": "ProprietaryInteger",
                    title: "Updated client number",
                    value: 10001
                }
            }
        })
    ).value;
    await services3.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
        predecessorId: succeededRelationshipAttributeClient31.id,
        successorContent: {
            value: {
                "@type": "ProprietaryInteger",
                title: "Updated client number",
                value: 10002
            }
        }
    });
}, 120000);
afterAll(async () => await runtimeServiceProvider.stop());

describe(CreateIdentityAttributeUseCase.name, () => {
    test("should create a repository attribute", async () => {
        const request: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const result = await services1.consumption.attributes.createIdentityAttribute(request);
        expect(result.isError).toBe(false);
        const attribute = result.value;
        expect(attribute.content).toMatchObject(request.content);
        await services1.eventBus.waitForEvent(AttributeCreatedEvent, (e) => e.data.id === attribute.id);
    });

    test("should create LocalAttributes for each property of a complex Identity Attribute", async function () {
        const attributesBeforeCreate = await services1.consumption.attributes.getAttributes({});
        const nrAttributesBeforeCreate = attributesBeforeCreate.value.length;

        const createIdentityAttributeParams: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "StreetAddress",
                    recipient: "ARecipient",
                    street: "AStreet",
                    houseNo: "AHouseNo",
                    zipCode: "AZipCode",
                    city: "ACity",
                    country: "DE"
                }
            }
        };
        const createIdentityAttributeResult = await services1.consumption.attributes.createIdentityAttribute(createIdentityAttributeParams);
        expect(createIdentityAttributeResult).toBeSuccessful();
        const complexRepoAttribute = createIdentityAttributeResult.value;

        const childAttributes = (
            await services1.consumption.attributes.getAttributes({
                query: {
                    parentId: complexRepoAttribute.id
                }
            })
        ).value;

        expect(childAttributes).toHaveLength(5);
        expect(childAttributes[0].content.value["@type"]).toBe("Street");
        expect((childAttributes[0].content.value as StreetJSON).value).toBe("AStreet");
        expect(childAttributes[1].content.value["@type"]).toBe("HouseNumber");
        expect((childAttributes[1].content.value as HouseNumberJSON).value).toBe("AHouseNo");
        expect(childAttributes[2].content.value["@type"]).toBe("ZipCode");
        expect((childAttributes[2].content.value as ZipCodeJSON).value).toBe("AZipCode");
        expect(childAttributes[3].content.value["@type"]).toBe("City");
        expect((childAttributes[3].content.value as CityJSON).value).toBe("ACity");
        expect(childAttributes[4].content.value["@type"]).toBe("Country");
        expect((childAttributes[4].content.value as CountryJSON).value).toBe("DE");

        const attributesAfterCreate = (await services1.consumption.attributes.getAttributes({})).value;
        const nrAttributesAfterCreate = attributesAfterCreate.length;
        expect(nrAttributesAfterCreate).toBe(nrAttributesBeforeCreate + 6);

        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "StreetAddress");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "Street");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "HouseNumber");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "ZipCode");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "City");
        await expect(services1.eventBus).toHavePublished(AttributeCreatedEvent, (e) => e.data.content.value["@type"] === "Country");
    });
});

describe(ShareIdentityAttributeUseCase.name, () => {
    test("should initialize the sharing of a identity attribute", async () => {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const createAttributeRequestResult = await services1.consumption.attributes.createIdentityAttribute(createAttributeRequest);
        const attribute = createAttributeRequestResult.value;

        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: attribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);
        const shareRequestId = shareRequestResult.value.id;

        await syncUntilHasMessageWithRequest(services2.transport, shareRequestId);
        await services2.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
        });
        await services2.consumption.incomingRequests.accept({ requestId: shareRequestId, items: [{ accept: true }] });

        const responseMessage = await syncUntilHasMessageWithResponse(services1.transport, shareRequestId);
        const sharedAttributeId: string = responseMessage.content.response.items[0].attributeId;
        await services1.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.Completed;
        });

        const senderOwnSharedIdentityAttributeResult = await services1.consumption.attributes.getAttribute({ id: sharedAttributeId });
        const recipientPeerSharedIdentityAttributeResult = await services2.consumption.attributes.getAttribute({ id: sharedAttributeId });
        expect(senderOwnSharedIdentityAttributeResult.isSuccess).toBe(true);
        expect(recipientPeerSharedIdentityAttributeResult.isSuccess).toBe(true);
        const recipientPeerSharedIdentityAttribute = recipientPeerSharedIdentityAttributeResult.value;
        const senderOwnSharedIdentityAttribute = senderOwnSharedIdentityAttributeResult.value;
        expect(senderOwnSharedIdentityAttribute.content).toStrictEqual(recipientPeerSharedIdentityAttribute.content);
        expect(senderOwnSharedIdentityAttribute.shareInfo?.sourceAttribute?.toString()).toBe(attribute.id);
    });

    test("should reject sharing an attribute, of which a previous version has been shared", async () => {
        const ownSharedIdentityAttribute = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });

        const { successor: successorRepoAttribute } = (
            await services1.consumption.attributes.succeedIdentityAttribute({
                predecessorId: ownSharedIdentityAttribute.shareInfo!.sourceAttribute!,
                successorContent: {
                    value: {
                        "@type": "GivenName",
                        value: "Tina Turner"
                    },
                    tags: ["tag1", "tag2"]
                }
            })
        ).value;

        const response = await services1.consumption.attributes.shareIdentityAttribute({
            attributeId: successorRepoAttribute.id,
            peer: services2.address
        });
        expect(response).toBeAnError(/.*/, "error.runtime.attributes.anotherVersionOfIdentityAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should reject attempts to share the same attribute more than once", async () => {
        const createIdentityAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const createAttributeRequestResult = await services1.consumption.attributes.createIdentityAttribute(createIdentityAttributeRequest);
        const repositoryAttribute = createAttributeRequestResult.value;

        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: repositoryAttribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        const shareRequestId = shareRequestResult.value.id;

        await syncUntilHasMessageWithRequest(services2.transport, shareRequestId);
        await services2.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
        });
        await services2.consumption.incomingRequests.accept({ requestId: shareRequestId, items: [{ accept: true }] });

        await syncUntilHasMessageWithResponse(services1.transport, shareRequestId);
        await services1.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.Completed;
        });

        const shareRequestResult2 = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult2).toBeAnError(/.*/, "error.runtime.attributes.identityAttributeHasAlreadyBeenSharedWithPeer");
    });

    test("should reject sharing relationship attribute", async () => {
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        const requestId = requestResult.value.id;

        await syncUntilHasMessageWithRequest(services2.transport, requestId);
        await services2.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
        });
        await services2.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

        const responseMessage = await syncUntilHasMessageWithResponse(services1.transport, requestId);
        const sharedAttributeId = responseMessage.content.response.items[0].attributeId;
        await services1.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.Completed;
        });

        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: sharedAttributeId,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.attributes.isNoIdentityAttribute");
    });

    test("should reject sharing peer shared attribute", async () => {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const createAttributeRequestResult = await services2.consumption.attributes.createIdentityAttribute(createAttributeRequest);
        const attribute = createAttributeRequestResult.value;

        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: attribute.id,
            peer: services1.address
        };
        const shareRequestResult = await services2.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);
        const shareRequestId = shareRequestResult.value.id;

        await syncUntilHasMessageWithRequest(services1.transport, shareRequestId);
        await services1.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
        });
        await services1.consumption.incomingRequests.accept({ requestId: shareRequestId, items: [{ accept: true }] });

        const responseMessage = await syncUntilHasMessageWithResponse(services2.transport, shareRequestId);
        const sharedAttributeId = responseMessage.content.response.items[0].attributeId;
        await services2.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.Completed;
        });

        const shareRequest2: ShareIdentityAttributeRequest = {
            attributeId: sharedAttributeId,
            peer: services2.address
        };
        const shareRequestResult2 = await services2.consumption.attributes.shareIdentityAttribute(shareRequest2);
        expect(shareRequestResult2).toBeAnError(/.*/, "error.runtime.attributes.isNoIdentityAttribute");
    });

    test("should reject sharing own shared attribute", async () => {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const createAttributeRequestResult = await services1.consumption.attributes.createIdentityAttribute(createAttributeRequest);
        const attribute = createAttributeRequestResult.value;

        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: attribute.id,
            peer: services2.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult.isSuccess).toBe(true);
        const shareRequestId = shareRequestResult.value.id;

        await syncUntilHasMessageWithRequest(services2.transport, shareRequestId);
        await services2.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
        });
        await services2.consumption.incomingRequests.accept({ requestId: shareRequestId, items: [{ accept: true }] });

        const responseMessage = await syncUntilHasMessageWithResponse(services1.transport, shareRequestId);
        const sharedAttributeId = responseMessage.content.response.items[0].attributeId;
        await services1.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === shareRequestId && e.data.newStatus === LocalRequestStatus.Completed;
        });

        const shareRequest2: ShareIdentityAttributeRequest = {
            attributeId: sharedAttributeId,
            peer: services2.address
        };
        const shareRequestResult2 = await services1.consumption.attributes.shareIdentityAttribute(shareRequest2);
        expect(shareRequestResult2).toBeAnError(/.*/, "error.runtime.attributes.isNoIdentityAttribute");
    });

    test("should throw when source attribute doesn't exist", async () => {
        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: (await CoreId.generate("ATT")).toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw when source attribute id is invalid ", async () => {
        const shareRequest: ShareIdentityAttributeRequest = {
            attributeId: CoreId.from("faulty").toString(),
            peer: services1.address
        };
        const shareRequestResult = await services1.consumption.attributes.shareIdentityAttribute(shareRequest);
        expect(shareRequestResult).toBeAnError(/.*/, "error.runtime.validation.invalidPropertyValue");
    });
});

describe(SucceedIdentityAttributeUseCase.name, () => {
    test("should succeed a repository attribute", async () => {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result.isError).toBe(false);
        const { predecessor: updatedPredecessor, successor } = result.value;
        expect(updatedPredecessor.succeededBy).toStrictEqual(successor.id);
        expect((successor as any).content.value.value).toBe("Tina Turner");
        await services1.eventBus.waitForEvent(RepositoryAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === updatedPredecessor.id && e.data.successor.id === successor.id;
        });
    });

    test("should throw if predecessor id is invalid", async () => {
        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: CoreId.from("faulty").toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("should throw if predecessor doesn't exist", async () => {
        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: (await CoreId.generate("ATT")).toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.predecessorDoesNotExist");
    });

    test("validation should catch attempts of changing the value type", async () => {
        const createAttributeRequest: CreateIdentityAttributeRequest = {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        };
        const predecessor = (await services1.consumption.attributes.createIdentityAttribute(createAttributeRequest)).value;

        const succeedAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: predecessor.id.toString(),
            successorContent: {
                value: {
                    "@type": "PhoneNumber",
                    value: "+4915155253460"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const result = await services1.consumption.attributes.succeedIdentityAttribute(succeedAttributeRequest);
        expect(result).toBeAnError(/.*/, "error.consumption.attributes.successionMustNotChangeValueType");
    });
});

describe(NotifyPeerAboutIdentityAttributeSuccessionUseCase.name, () => {
    test("should succeed shared identity attributes", async () => {
        const sOSIAPredecessor = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });
        const succeedIdentityAttributeRequest: SucceedIdentityAttributeRequest = {
            predecessorId: sOSIAPredecessor.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const { successor: sRASuccessor1 } = (await services1.consumption.attributes.succeedIdentityAttribute(succeedIdentityAttributeRequest)).value;

        const result = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRASuccessor1.id,
            peer: services2.address
        });
        expect(result.isSuccess).toBe(true);
        const { predecessor: sUpdatedOSIAPredecessor, successor: sOSIASuccessor } = result.value;

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor.id;
        });
        const notificationId = sOSIASuccessor.shareInfo?.notificationReference;
        expect(notificationId).toBeDefined();
        await syncUntilHasMessageWithNotification(services2.transport, notificationId!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor.id;
        });

        const sOwnSharedAttributes = (await services1.consumption.attributes.getOwnSharedAttributes({ peer: services2.address })).value;
        const sOSASuccessors = sOwnSharedAttributes.filter((x) => x.succeeds === sUpdatedOSIAPredecessor.id);
        expect(sOSASuccessors).toStrictEqual([sOSIASuccessor]);
        expect(sOSIASuccessor.content.value).toStrictEqual(succeedIdentityAttributeRequest.successorContent.value);
        expect((sOSIASuccessor as any).content.tags).toStrictEqual(succeedIdentityAttributeRequest.successorContent.tags);

        const succeedIdentityAttributeRequest2: SucceedIdentityAttributeRequest = {
            predecessorId: sRASuccessor1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Freddy Mercury"
                },
                tags: ["Champions"]
            }
        };
        const { successor: sRASuccessor2 } = (await services1.consumption.attributes.succeedIdentityAttribute(succeedIdentityAttributeRequest2)).value;
        const result2 = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRASuccessor2.id,
            peer: services2.address
        });
        expect(result2.isSuccess).toBe(true);
    });

    test("should succeed a shared identity attribute skipping one version", async () => {
        const sOSIAPredecessor = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });
        const sSucceedIARequest1: SucceedIdentityAttributeRequest = {
            predecessorId: sOSIAPredecessor.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const { successor: sRASuccessor1 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest1)).value;
        const sSucceedIARequest2: SucceedIdentityAttributeRequest = {
            predecessorId: sRASuccessor1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Martina Mustermann"
                }
            }
        };
        const { successor: sRASuccessor2 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest2)).value;

        const result = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRASuccessor2.id,
            peer: services2.address
        });
        expect(result.isSuccess).toBe(true);
        const { predecessor: sUpdatedOSIAPredecessor, successor: sOSIASuccessor2Skipped1 } = result.value;

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor2Skipped1.id;
        });
        const notificationId = sOSIASuccessor2Skipped1.shareInfo?.notificationReference;
        expect(notificationId).toBeDefined();
        await syncUntilHasMessageWithNotification(services2.transport, notificationId!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor2Skipped1.id;
        });

        const sOwnSharedAttributes = (await services1.consumption.attributes.getOwnSharedAttributes({ peer: services2.address })).value;
        const senderSharedSuccessor = sOwnSharedAttributes.filter((x) => x.succeeds === sUpdatedOSIAPredecessor.id);
        expect(senderSharedSuccessor).toHaveLength(1);
        expect(senderSharedSuccessor[0]).toStrictEqual(sOSIASuccessor2Skipped1);
        expect((senderSharedSuccessor[0] as any).content.value.value).toBe("Martina Mustermann");
    });

    test("should throw an error if a later version of the attribute has been notified about already", async () => {
        const sOSIAPredecessor = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });
        const sSucceedIARequest1: SucceedIdentityAttributeRequest = {
            predecessorId: sOSIAPredecessor.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const { successor: sRASuccessor1 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest1)).value;
        const sSucceedIARequest2: SucceedIdentityAttributeRequest = {
            predecessorId: sRASuccessor1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Martina Mustermann"
                }
            }
        };
        const { successor: sRASuccessor2 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest2)).value;

        const result = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRASuccessor2.id,
            peer: services2.address
        });
        expect(result.isSuccess).toBe(true);
        const { predecessor: sUpdatedOSIAPredecessor, successor: sOSIASuccessor2Skipped1 } = result.value;

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor2Skipped1.id;
        });
        const notificationId = sOSIASuccessor2Skipped1.shareInfo?.notificationReference;
        expect(notificationId).toBeDefined();
        await syncUntilHasMessageWithNotification(services2.transport, notificationId!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor2Skipped1.id;
        });

        const result2 = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRASuccessor1.id,
            peer: services2.address
        });
        expect(result2).toBeAnError(/.*/, "error.consumption.attributes.invalidSuccessionOfOwnSharedIdentityAttribute");
    });

    test("should prevent attempts of notifying the same peer about the same attribute succession more than once", async () => {
        const sOSIAPredecessor = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "Petra Pan"
                },
                tags: ["tag1", "tag2"]
            }
        });
        const sSucceedIARequest1: SucceedIdentityAttributeRequest = {
            predecessorId: sOSIAPredecessor.shareInfo!.sourceAttribute!,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Tina Turner"
                },
                tags: ["Bunsen", "Burner"]
            }
        };
        const { successor: sRASuccessor1 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest1)).value;
        const sSucceedIARequest2: SucceedIdentityAttributeRequest = {
            predecessorId: sRASuccessor1.id,
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Martina Mustermann"
                }
            }
        };
        const { successor: sRASuccessor2 } = (await services1.consumption.attributes.succeedIdentityAttribute(sSucceedIARequest2)).value;

        const result = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRASuccessor2.id,
            peer: services2.address
        });
        expect(result.isSuccess).toBe(true);
        const { predecessor: sUpdatedOSIAPredecessor, successor: sOSIASuccessor2Skipped1 } = result.value;

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor2Skipped1.id;
        });
        const notificationId = sOSIASuccessor2Skipped1.shareInfo?.notificationReference;
        expect(notificationId).toBeDefined();
        await syncUntilHasMessageWithNotification(services2.transport, notificationId!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === sUpdatedOSIAPredecessor.id && e.data.successor.id === sOSIASuccessor2Skipped1.id;
        });

        const result2 = await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
            attributeId: sRASuccessor2.id,
            peer: services2.address
        });
        expect(result2).toBeAnError(/.*/, "error.runtime.attributes.identityAttributeHasAlreadyBeenSharedWithPeer");
    });
});

describe(CreateAndShareRelationshipAttributeUseCase.name, () => {
    test("should create and share a relationship attribute", async () => {
        const createAndShareRelationshipAttributeRequest: CreateAndShareRelationshipAttributeRequest = {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            },
            peer: services2.address
        };
        const requestResult = await services1.consumption.attributes.createAndShareRelationshipAttribute(createAndShareRelationshipAttributeRequest);
        expect(requestResult.isSuccess).toBe(true);
        const requestId = requestResult.value.id;

        await syncUntilHasMessageWithRequest(services2.transport, requestId);
        await services2.eventBus.waitForEvent(IncomingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.ManualDecisionRequired;
        });
        await services2.consumption.incomingRequests.accept({ requestId, items: [{ accept: true }] });

        const responseMessage = await syncUntilHasMessageWithResponse(services1.transport, requestId);
        const sharedAttributeId: string = responseMessage.content.response.items[0].attributeId;
        await services1.eventBus.waitForEvent(OutgoingRequestStatusChangedEvent, (e) => {
            return e.data.request.id === requestId && e.data.newStatus === LocalRequestStatus.Completed;
        });

        const senderOwnSharedRelationshipAttributeResult = await services1.consumption.attributes.getAttribute({ id: sharedAttributeId });
        const recipientPeerSharedRelationshipAttributeResult = await services2.consumption.attributes.getAttribute({ id: sharedAttributeId });
        expect(senderOwnSharedRelationshipAttributeResult.isSuccess).toBe(true);
        expect(recipientPeerSharedRelationshipAttributeResult.isSuccess).toBe(true);
        const senderOwnSharedRelationshipAttribute = senderOwnSharedRelationshipAttributeResult.value;
        const recipientPeerSharedRelationshipAttribute = recipientPeerSharedRelationshipAttributeResult.value;
        expect(senderOwnSharedRelationshipAttribute.content).toStrictEqual(recipientPeerSharedRelationshipAttribute.content);
    });
});

describe(SucceedRelationshipAttributeAndNotifyPeerUseCase.name, () => {
    test("should create and share a relationship attribute", async () => {
        const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });

        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: ownSharedRelationshipAttribute.id,
            successorContent: {
                value: {
                    "@type": "ProprietaryString",
                    value: "another String",
                    title: "another title"
                }
            }
        });
        expect(result.isSuccess).toBe(true);
        const { predecessor, successor } = result.value;

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === predecessor.id && e.data.successor.id === successor.id;
        });
        const notificationId = successor.shareInfo?.notificationReference;
        expect(notificationId).toBeDefined();
        await syncUntilHasMessageWithNotification(services2.transport, notificationId!);

        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === predecessor.id && e.data.successor.id === successor.id;
        });

        const senderPredecessor = (await services1.consumption.attributes.getAttribute({ id: predecessor.id })).value;
        const senderSuccessor = (await services1.consumption.attributes.getAttribute({ id: successor.id })).value;
        const recipientPredecessor = (await services2.consumption.attributes.getAttribute({ id: predecessor.id })).value;
        const recipientSuccessor = (await services2.consumption.attributes.getAttribute({ id: successor.id })).value;
        expect(senderSuccessor.content).toStrictEqual(recipientSuccessor.content);
        expect(senderSuccessor.shareInfo!.notificationReference).toStrictEqual(recipientSuccessor.shareInfo!.notificationReference);
        expect(senderSuccessor.shareInfo!.requestReference).toBeUndefined();
        expect(recipientSuccessor.shareInfo!.requestReference).toBeUndefined();
        expect(senderSuccessor.shareInfo!.peer).toBe(services2.address);
        expect(recipientSuccessor.shareInfo!.peer).toBe(services1.address);
        expect(senderSuccessor.succeeds).toBe(senderPredecessor.id);
        expect(recipientSuccessor.succeeds).toBe(recipientPredecessor.id);
        expect(recipientPredecessor.succeededBy).toBe(recipientSuccessor.id);
    });

    test("should throw changing the value type succeeding a relationship attribute", async () => {
        const ownSharedRelationshipAttribute = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "test",
                value: {
                    "@type": "ProprietaryString",
                    value: "a String",
                    title: "a title"
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });

        const result = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: ownSharedRelationshipAttribute.id,
            successorContent: {
                value: {
                    "@type": "ProprietaryBoolean",
                    value: true,
                    title: "another title"
                }
            }
        });

        expect(result).toBeAnError(/.*/, "error.consumption.attributes.successionMustNotChangeValueType");
    });
});

describe("Get versions of attribute", () => {
    let repositoryAttributeVersion1: LocalAttributeDTO;
    let repositoryAttributeVersion2: LocalAttributeDTO;
    let repositoryAttributeVersion3: LocalAttributeDTO;
    let ownSharedIdentityAttributeVersion1: LocalAttributeDTO;
    let ownSharedIdentityAttributeVersion3: LocalAttributeDTO;

    let ownSharedRelationshipAttributeVersion1: LocalAttributeDTO;
    let ownSharedRelationshipAttributeVersion2: LocalAttributeDTO;
    let ownSharedRelationshipAttributeVersion3: LocalAttributeDTO;
    beforeAll(async () => {
        // setup IdentityAttributes
        ownSharedIdentityAttributeVersion1 = await executeFullCreateAndShareIdentityAttributeFlow(services1, services2, {
            content: {
                value: {
                    "@type": "GivenName",
                    value: "First Name"
                },
                tags: ["tag1"]
            }
        });
        repositoryAttributeVersion1 = (await services1.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.shareInfo!.sourceAttribute! })).value;

        const succeedRepositoryAttributeRequest1: SucceedIdentityAttributeRequest = {
            predecessorId: repositoryAttributeVersion1.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Second Name"
                },
                tags: ["tag2"]
            }
        };
        const repositoryAttributeSuccessionResult1 = await services1.consumption.attributes.succeedIdentityAttribute(succeedRepositoryAttributeRequest1);
        ({ predecessor: repositoryAttributeVersion1, successor: repositoryAttributeVersion2 } = repositoryAttributeSuccessionResult1.value);

        const succeedRepositoryAttributeRequest2: SucceedIdentityAttributeRequest = {
            predecessorId: repositoryAttributeVersion2.id.toString(),
            successorContent: {
                value: {
                    "@type": "GivenName",
                    value: "Third Name"
                },
                tags: ["tag3"]
            }
        };
        const repositoryAttributeSuccessionResult2 = await services1.consumption.attributes.succeedIdentityAttribute(succeedRepositoryAttributeRequest2);
        ({ predecessor: repositoryAttributeVersion2, successor: repositoryAttributeVersion3 } = repositoryAttributeSuccessionResult2.value);

        ({ predecessor: ownSharedIdentityAttributeVersion1, successor: ownSharedIdentityAttributeVersion3 } = (
            await services1.consumption.attributes.notifyPeerAboutIdentityAttributeSuccession({
                attributeId: repositoryAttributeVersion3.id,
                peer: services2.address
            })
        ).value);

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedIdentityAttributeVersion1.id && e.data.successor.id === ownSharedIdentityAttributeVersion3.id;
        });
        const notificationIdIA = ownSharedIdentityAttributeVersion3.shareInfo?.notificationReference;
        await syncUntilHasMessageWithNotification(services2.transport, notificationIdIA!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedIdentityAttributeVersion1.id && e.data.successor.id === ownSharedIdentityAttributeVersion3.id;
        });

        // setup RelationshipAttributes
        ownSharedRelationshipAttributeVersion1 = await executeFullCreateAndShareRelationshipAttributeFlow(services1, services2, {
            content: {
                key: "Some key",
                value: {
                    "@type": "ProprietaryInteger",
                    title: "Version",
                    value: 1
                },
                confidentiality: RelationshipAttributeConfidentiality.Public
            }
        });

        const relationshipAttributeSuccessionResult1 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: ownSharedRelationshipAttributeVersion1.id.toString(),
            successorContent: {
                value: {
                    "@type": "ProprietaryInteger",
                    title: "Version",
                    value: 2
                }
            }
        });
        ({ predecessor: ownSharedRelationshipAttributeVersion1, successor: ownSharedRelationshipAttributeVersion2 } = relationshipAttributeSuccessionResult1.value);

        const relationshipAttributeSuccessionResult2 = await services1.consumption.attributes.succeedRelationshipAttributeAndNotifyPeer({
            predecessorId: ownSharedRelationshipAttributeVersion2.id.toString(),
            successorContent: {
                value: {
                    "@type": "ProprietaryInteger",
                    title: "Version",
                    value: 3
                }
            }
        });
        ({ predecessor: ownSharedRelationshipAttributeVersion2, successor: ownSharedRelationshipAttributeVersion3 } = relationshipAttributeSuccessionResult2.value);

        await services1.eventBus.waitForEvent(OwnSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedRelationshipAttributeVersion2.id && e.data.successor.id === ownSharedRelationshipAttributeVersion3.id;
        });
        const notificationIdRA = ownSharedRelationshipAttributeVersion3.shareInfo?.notificationReference;
        await syncUntilHasMessageWithNotification(services2.transport, notificationIdRA!);
        await services2.eventBus.waitForEvent(PeerSharedAttributeSucceededEvent, (e) => {
            return e.data.predecessor.id === ownSharedRelationshipAttributeVersion2.id && e.data.successor.id === ownSharedRelationshipAttributeVersion3.id;
        });
    });

    test("should get all versions of a repository attribute", async () => {
        const repositoryAttributeVersions = [repositoryAttributeVersion3, repositoryAttributeVersion2, repositoryAttributeVersion1];
        for (const version of repositoryAttributeVersions) {
            const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
            expect(result.isSuccess).toBe(true);

            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual(repositoryAttributeVersions);
        }
    });

    test("should get all versions of an own shared identity attribute shared with the same peer", async () => {
        const ownSharedIdentityAttributeVersions = [ownSharedIdentityAttributeVersion3, ownSharedIdentityAttributeVersion1];
        for (const version of ownSharedIdentityAttributeVersions) {
            const result1 = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
            expect(result1.isSuccess).toBe(true);
            const returnedVersions1 = result1.value;
            expect(returnedVersions1).toStrictEqual(ownSharedIdentityAttributeVersions);

            const result2 = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: version.id });
            expect(result2.isSuccess).toBe(true);
            const returnedVersions2 = result2.value;
            expect(returnedVersions2).toStrictEqual(ownSharedIdentityAttributeVersions);
        }
    });

    test("should get all versions of a peer shared identity attribute", async () => {
        const peerSharedIdentityAttributeVersion3 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion3.id })).value;
        const peerSharedIdentityAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedIdentityAttributeVersion1.id })).value;
        const peerSharedIdentityAttributeVersions = [peerSharedIdentityAttributeVersion3, peerSharedIdentityAttributeVersion1];

        for (const version of peerSharedIdentityAttributeVersions) {
            const result1 = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
            expect(result1.isSuccess).toBe(true);
            const returnedVersions1 = result1.value;
            expect(returnedVersions1).toStrictEqual(peerSharedIdentityAttributeVersions);

            const result2 = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
            expect(result2.isSuccess).toBe(true);
            const returnedVersions2 = result2.value;
            expect(returnedVersions2).toStrictEqual(peerSharedIdentityAttributeVersions);
        }
    });

    test("should get all shared versions of a repository attribute", async () => {
        const repositoryAttributeVersions = [repositoryAttributeVersion3, repositoryAttributeVersion2, repositoryAttributeVersion1];
        for (const version of repositoryAttributeVersions) {
            const result = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: version.id });
            expect(result.isSuccess).toBe(true);

            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual([ownSharedIdentityAttributeVersion1, ownSharedIdentityAttributeVersion3]);
        }
    });

    test("should throw if the attribute doesn't exist", async () => {
        const result1 = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
        expect(result1).toBeAnError(/.*/, "error.runtime.recordNotFound");

        const result2 = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: "ATTxxxxxxxxxxxxxxxxx" });
        expect(result2).toBeAnError(/.*/, "error.runtime.recordNotFound");
    });

    test("should throw if getSharedVersionsOfIdentityAttribute is called with a RelationshipAttribute", async () => {
        const result = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: ownSharedRelationshipAttributeVersion1.id });
        expect(result).toBeAnError(/.*/, "error.runtime.validation.invalidPropertyValue");
    });

    test("should get all versions of an own shared relationship attribute", async () => {
        const ownSharedRelationshipAttributeVersions = [ownSharedRelationshipAttributeVersion3, ownSharedRelationshipAttributeVersion2, ownSharedRelationshipAttributeVersion1];
        for (const version of ownSharedRelationshipAttributeVersions) {
            const result = await services1.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
            expect(result.isSuccess).toBe(true);

            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual(ownSharedRelationshipAttributeVersions);
        }
    });

    test("should get all versions of a peer shared relationship attribute", async () => {
        const peerSharedRelationshipAttributeVersion3 = (await services2.consumption.attributes.getAttribute({ id: ownSharedRelationshipAttributeVersion3.id })).value;
        const peerSharedRelationshipAttributeVersion2 = (await services2.consumption.attributes.getAttribute({ id: ownSharedRelationshipAttributeVersion2.id })).value;
        const peerSharedRelationshipAttributeVersion1 = (await services2.consumption.attributes.getAttribute({ id: ownSharedRelationshipAttributeVersion1.id })).value;
        const peerSharedRelationshipAttributeVersions = [peerSharedRelationshipAttributeVersion3, peerSharedRelationshipAttributeVersion2, peerSharedRelationshipAttributeVersion1];

        for (const version of peerSharedRelationshipAttributeVersions) {
            const result = await services2.consumption.attributes.getVersionsOfAttribute({ attributeId: version.id });
            expect(result.isSuccess).toBe(true);

            const returnedVersions = result.value;
            expect(returnedVersions).toStrictEqual(peerSharedRelationshipAttributeVersions);
        }
    });

    test("should throw trying to call getSharedVersionsOfIdentityAttribute with a relationship attribute", async () => {
        const result = await services1.consumption.attributes.getSharedVersionsOfIdentityAttribute({ attributeId: ownSharedRelationshipAttributeVersion3.id });
        expect(result).toBeAnError(/.*/, "error.runtime.validation.invalidPropertyValue");
    });
});
