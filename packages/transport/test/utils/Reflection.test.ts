import { Serializable } from "@js-soft/ts-serval"
import {
    CoreBuffer,
    CryptoCipher,
    CryptoExchangeKeypair,
    CryptoExchangePrivateKey,
    CryptoExchangeSecrets,
    CryptoPrivateStateReceive,
    CryptoPrivateStateTransmit,
    CryptoPublicState,
    CryptoRelationshipPublicRequest,
    CryptoRelationshipRequestSecrets,
    CryptoRelationshipSecrets,
    CryptoSecretKey,
    CryptoSignature,
    CryptoSignatureKeypair,
    CryptoSignaturePrivateKey,
    CryptoSignaturePublicKey
} from "@nmshd/crypto"
import {
    CachedRelationshipTemplate,
    Device,
    File,
    FileMetadata,
    FileReference,
    Identity,
    Message,
    MessageContentWrapper,
    MessageEnvelope,
    MessageEnvelopeRecipient,
    MessageSigned,
    Relationship,
    RelationshipChange,
    RelationshipChangeRequest,
    RelationshipChangeResponse,
    RelationshipCreationChangeRequestCipher,
    RelationshipCreationChangeRequestContentWrapper,
    RelationshipCreationChangeRequestSigned,
    RelationshipCreationChangeResponseCipher,
    RelationshipCreationChangeResponseContentWrapper,
    RelationshipCreationChangeResponseSigned,
    RelationshipTemplate,
    RelationshipTemplateContentWrapper,
    RelationshipTemplatePublicKey,
    RelationshipTemplateSigned,
    Token,
    TokenContentRelationshipTemplate
} from "@vermascht/transport"
import { expect } from "chai"
import { AbstractUnitTest } from "../testHelpers"

export class ReflectionTest extends AbstractUnitTest {
    public static cryptoClassNames: string[] = [
        `${CryptoCipher.name}@1`,
        `${CryptoSecretKey.name}@1`,
        `${CryptoExchangeKeypair.name}@1`,
        `${CryptoExchangePrivateKey.name}@1`,
        `${CryptoExchangePrivateKey.name}@1`,
        `${CryptoExchangeSecrets.name}@1`,
        `${CryptoRelationshipPublicRequest.name}@1`,
        `${CryptoRelationshipPublicRequest.name}@1`,
        `${CryptoRelationshipRequestSecrets.name}@1`,
        `${CryptoRelationshipSecrets.name}@1`,
        `${CryptoSignatureKeypair.name}@1`,
        `${CryptoSignaturePrivateKey.name}@1`,
        `${CryptoSignaturePublicKey.name}@1`,
        `${CryptoSignature.name}@1`,
        `${CryptoPrivateStateReceive.name}@1`,
        `${CryptoPrivateStateTransmit.name}@1`,
        `${CryptoPublicState.name}@1`,
        `${CoreBuffer.name}@1`
    ]

    public static transportClassNames: string[] = [
        `${Device.name}@1`,
        `${Identity.name}@1`,
        `${FileMetadata.name}@1`,
        `${FileReference.name}@1`,
        `${File.name}@1`,
        `${MessageEnvelope.name}@1`,
        `${MessageEnvelopeRecipient.name}@1`,
        `${MessageContentWrapper.name}@1`,
        `${"MessageSignature"}@1`,
        `${MessageSigned.name}@1`,
        `${Message.name}@1`,
        `${CachedRelationshipTemplate.name}@1`,
        `${Relationship.name}@1`,
        `${RelationshipChange.name}@1`,
        `${RelationshipChangeRequest.name}@1`,
        `${RelationshipChangeResponse.name}@1`,
        `${RelationshipTemplate.name}@1`,
        `${RelationshipCreationChangeRequestCipher.name}@1`,
        `${RelationshipCreationChangeRequestContentWrapper.name}@1`,
        `${RelationshipCreationChangeRequestSigned.name}@1`,
        `${RelationshipCreationChangeResponseCipher.name}@1`,
        `${RelationshipCreationChangeResponseContentWrapper.name}@1`,
        `${RelationshipCreationChangeResponseSigned.name}@1`,
        `${RelationshipTemplateContentWrapper.name}@1`,
        `${RelationshipTemplatePublicKey.name}@1`,
        `${RelationshipTemplateSigned.name}@1`,
        `${Token.name}@1`,
        `${TokenContentRelationshipTemplate.name}@1`
    ]

    public run(): void {
        const that = this
        describe("ReflectionTest", function () {
            it("should find all Crypto classes", function () {
                const reflectionKeys = Reflect.getMetadataKeys(Serializable, "types")
                const notFoundClasses: string[] = []
                for (const className of ReflectionTest.cryptoClassNames) {
                    if (!reflectionKeys.includes(className)) {
                        notFoundClasses.push(className)
                        that.logger.error(`Class ${className} not registered`)
                    }
                }
                expect(notFoundClasses).to.have.lengthOf(
                    0,
                    `Required classes ${notFoundClasses} are not registered within Serializable reflection classes.`
                )
            })

            it("should find all TransportLib classes", function () {
                const reflectionKeys = Reflect.getMetadataKeys(Serializable, "types")
                const notFoundClasses: string[] = []

                for (const className of ReflectionTest.transportClassNames) {
                    if (!reflectionKeys.includes(className)) {
                        notFoundClasses.push(className)
                        that.logger.error(`Class ${className} not registered`)
                    }
                }
                expect(notFoundClasses).to.have.lengthOf(
                    0,
                    `Required classes ${notFoundClasses} are not registered within Serializable reflection classes.`
                )
            })
        })
    }
}
