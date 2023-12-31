import { EventBus } from "@js-soft/ts-utils"
import * as iql from "@nmshd/iql"
import {
    AbstractAttributeValue,
    AbstractComplexValue,
    AttributeValues,
    IIQLQuery,
    IIdentityAttributeQuery,
    IRelationshipAttributeQuery,
    IThirdPartyRelationshipAttributeQuery,
    IdentityAttribute,
    IdentityAttributeQuery,
    RelationshipAttributeJSON,
    RelationshipAttributeQuery,
    ThirdPartyRelationshipAttributeQuery
} from "@vermascht/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    ICoreDate,
    ICoreId,
    SynchronizedCollection,
    CoreErrors as TransportCoreErrors
} from "@vermascht/transport"
import _ from "lodash"
import { nameof } from "ts-simple-nameof"
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName"
import { ConsumptionError } from "../../consumption/ConsumptionError"
import { ConsumptionIds } from "../../consumption/ConsumptionIds"
import { CoreErrors } from "../../consumption/CoreErrors"
import { ValidationResult } from "../common"
import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    OwnSharedAttributeSucceededEvent,
    RepositoryAttributeSucceededEvent,
    SharedAttributeCopyCreatedEvent
} from "./events"
import {
    AttributeSuccessorParams,
    AttributeSuccessorParamsJSON,
    IAttributeSuccessorParams
} from "./local/AttributeSuccessorParams"
import { CreateLocalAttributeParams, ICreateLocalAttributeParams } from "./local/CreateLocalAttributeParams"
import { ICreatePeerLocalAttributeParams } from "./local/CreatePeerLocalAttributeParams"
import {
    CreateSharedLocalAttributeCopyParams,
    ICreateSharedLocalAttributeCopyParams
} from "./local/CreateSharedLocalAttributeCopyParams"
import { ILocalAttribute, LocalAttribute, LocalAttributeJSON } from "./local/LocalAttribute"
import { LocalAttributeShareInfo } from "./local/LocalAttributeShareInfo"
import {
    IdentityAttributeQueryTranslator,
    RelationshipAttributeQueryTranslator,
    ThirdPartyRelationshipAttributeQueryTranslator
} from "./local/QueryTranslator"

export class AttributesController extends ConsumptionBaseController {
    private attributes: SynchronizedCollection

    public constructor(
        parent: ConsumptionController,
        private readonly eventBus: EventBus,
        private readonly identity: { address: CoreAddress }
    ) {
        super(ConsumptionControllerName.AttributesController, parent)
    }

    public override async init(): Promise<this> {
        await super.init()

        this.attributes = await this.parent.accountController.getSynchronizedCollection("Attributes")

        return this
    }

    public checkValid(attribute: LocalAttribute): boolean {
        const now = CoreDate.utc()
        if (!attribute.content.validFrom && !attribute.content.validTo) {
            return true
        } else if (
            attribute.content.validFrom &&
            !attribute.content.validTo &&
            attribute.content.validFrom.isSameOrBefore(now)
        ) {
            return true
        } else if (
            !attribute.content.validFrom &&
            attribute.content.validTo &&
            attribute.content.validTo.isSameOrAfter(now)
        ) {
            return true
        } else if (
            attribute.content.validFrom &&
            attribute.content.validTo &&
            attribute.content.validFrom.isSameOrBefore(now) &&
            attribute.content.validTo.isSameOrAfter(now)
        ) {
            return true
        }
        return false
    }

    public findCurrent(attributes: LocalAttribute[]): LocalAttribute | undefined {
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt)
        })
        let current: LocalAttribute | undefined
        for (const attribute of sorted) {
            if (this.checkValid(attribute)) {
                current = attribute
            }
        }
        return current
    }

    public filterCurrent(attributes: LocalAttribute[]): LocalAttribute[] {
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt)
        })

        const items = []
        for (const attribute of sorted) {
            if (this.checkValid(attribute)) {
                items.push(attribute)
            }
        }
        return items
    }

    public async getLocalAttribute(id: CoreId): Promise<LocalAttribute | undefined> {
        const result = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: id.toString()
        })

        if (!result) return
        return LocalAttribute.from(result)
    }

    public async getLocalAttributes(query?: any, hideTechnical = false, onlyValid = false): Promise<LocalAttribute[]> {
        const enrichedQuery = this.enrichQuery(query, hideTechnical)
        const attributes = await this.attributes.find(enrichedQuery)
        const parsed = this.parseArray(attributes, LocalAttribute)
        if (!onlyValid) return parsed

        return this.filterCurrent(parsed)
    }

    private enrichQuery(query: any, hideTechnical: boolean) {
        if (!hideTechnical) return query

        const hideTechnicalQuery = {
            $or: [
                {
                    [`${nameof<LocalAttributeJSON>((c) => c.content)}.@type`]: "IdentityAttribute"
                },
                {
                    $and: [
                        {
                            [`${nameof<LocalAttributeJSON>((c) => c.content)}.@type`]: "RelationshipAttribute"
                        },
                        {
                            [`${nameof<LocalAttributeJSON>((c) => c.content)}.${nameof<RelationshipAttributeJSON>(
                                (c) => c.isTechnical
                            )}`]: false
                        }
                    ]
                }
            ]
        }

        if (!query) return hideTechnicalQuery

        return { $and: [query, hideTechnicalQuery] }
    }

    public async getValidLocalAttributes(query?: any, hideTechnical = false): Promise<LocalAttribute[]> {
        return await this.getLocalAttributes(query, hideTechnical, true)
    }

    public async executeIQLQuery(query: IIQLQuery): Promise<LocalAttribute[]> {
        /* Fetch subset of attributes relevant for IQL queries. We filter for
         * identity attributes which are not shared. */
        const envelopedAttributes: any[] = await this.attributes.find({
            "content.@type": "IdentityAttribute",
            shareInfo: {
                $exists: false
            }
        })

        /* Remove envelope from attributes and execute query. IQL makes no use
         * of the envelope data. */
        const attributes: iql.AttributeView[] = envelopedAttributes.map((e) => {
            return e.content
        }) as iql.AttributeView[]
        const indices = iql.execute(query.queryString, attributes)

        /* Map matched indices back to their respective attributes and return. */
        const matchedAttributes = indices.map((ii) => envelopedAttributes[ii])
        const result = this.parseArray(matchedAttributes, LocalAttribute)
        return result
    }

    public async executeRelationshipAttributeQuery(
        query: IRelationshipAttributeQuery
    ): Promise<LocalAttribute | undefined> {
        const parsedQuery = RelationshipAttributeQuery.from(query)

        const dbQuery = RelationshipAttributeQueryTranslator.translate(parsedQuery)
        dbQuery["content.confidentiality"] = { $ne: "private" }

        const attributes = await this.attributes.find(dbQuery)
        const attribute = attributes.length > 0 ? LocalAttribute.from(attributes[0]) : undefined

        return attribute
    }

    public async executeThirdPartyRelationshipAttributeQuery(
        query: IThirdPartyRelationshipAttributeQuery
    ): Promise<LocalAttribute[]> {
        const parsedQuery = ThirdPartyRelationshipAttributeQuery.from(query)

        const dbQuery = ThirdPartyRelationshipAttributeQueryTranslator.translate(parsedQuery)
        dbQuery["content.confidentiality"] = { $ne: "private" }

        const attributes = await this.attributes.find(dbQuery)

        return this.parseArray(attributes, LocalAttribute)
    }

    public async executeIdentityAttributeQuery(query: IIdentityAttributeQuery): Promise<LocalAttribute[]> {
        const parsedQuery = IdentityAttributeQuery.from(query)
        const dbQuery = IdentityAttributeQueryTranslator.translate(parsedQuery)
        dbQuery["content.owner"] = this.identity.address.toString()
        dbQuery["shareInfo"] = { $exists: false }

        const attributes = await this.attributes.find(dbQuery)

        return this.parseArray(attributes, LocalAttribute)
    }

    public async createLocalAttribute(params: ICreateLocalAttributeParams): Promise<LocalAttribute> {
        const parsedParams = CreateLocalAttributeParams.from(params)
        const localAttribute = LocalAttribute.from({
            id: parsedParams.id ?? (await ConsumptionIds.attribute.generate()),
            createdAt: CoreDate.utc(),
            content: parsedParams.content,
            parentId: parsedParams.parentId,
            succeeds: parsedParams.succeeds,
            shareInfo: parsedParams.shareInfo
        })

        await this.attributes.create(localAttribute)

        if (
            localAttribute.content instanceof IdentityAttribute && // nested Local Attributes should only be created for Identity Attributes
            localAttribute.content.value instanceof AbstractComplexValue
        ) {
            await this.createLocalAttributesForNestedAttributeValues(localAttribute)
        }

        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), localAttribute))

        return localAttribute
    }

    private async createLocalAttributesForNestedAttributeValues(localAttribute: LocalAttribute): Promise<void> {
        if (!(localAttribute.content instanceof IdentityAttribute)) {
            throw new ConsumptionError("Only Identity Attributes are allowed here")
        }

        const nestedAttributeValues = Object.values(localAttribute.content.value).filter(
            (p) => p instanceof AbstractAttributeValue
        ) as AttributeValues.Identity.Class[]

        for (const propertyValue of nestedAttributeValues) {
            const nestedAttribute = IdentityAttribute.from({
                ...localAttribute.content.toJSON(),
                value: propertyValue.toJSON() as AttributeValues.Identity.Json
            })

            await this.createLocalAttribute({ content: nestedAttribute, parentId: localAttribute.id })
        }
    }

    public async createSharedLocalAttributeCopy(
        params: ICreateSharedLocalAttributeCopyParams
    ): Promise<LocalAttribute> {
        const parsedParams = CreateSharedLocalAttributeCopyParams.from(params)
        const sourceAttribute = await this.getLocalAttribute(parsedParams.sourceAttributeId)
        if (!sourceAttribute) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, parsedParams.sourceAttributeId.toString())
        }

        const shareInfo = LocalAttributeShareInfo.from({
            peer: parsedParams.peer,
            requestReference: parsedParams.requestReference,
            sourceAttribute: parsedParams.sourceAttributeId
        })

        const sharedLocalAttributeCopy = await LocalAttribute.fromAttribute(
            sourceAttribute.content,
            undefined,
            shareInfo,
            parsedParams.attributeId
        )
        await this.attributes.create(sharedLocalAttributeCopy)
        this.eventBus.publish(
            new SharedAttributeCopyCreatedEvent(this.identity.address.toString(), sharedLocalAttributeCopy)
        )
        return sharedLocalAttributeCopy
    }

    public async createPeerLocalAttribute(params: ICreatePeerLocalAttributeParams): Promise<LocalAttribute> {
        const shareInfo = LocalAttributeShareInfo.from({
            peer: params.peer,
            requestReference: params.requestReference
        })
        const peerLocalAttribute = LocalAttribute.from({
            id: params.id ?? (await ConsumptionIds.attribute.generate()),
            content: params.content,
            shareInfo: shareInfo,
            createdAt: CoreDate.utc()
        })
        await this.attributes.create(peerLocalAttribute)
        this.eventBus.publish(new AttributeCreatedEvent(this.identity.address.toString(), peerLocalAttribute))
        return peerLocalAttribute
    }

    public async deleteAttribute(attribute: LocalAttribute): Promise<void> {
        await this.deleteAttributeUnsafe(attribute.id)
        this.eventBus.publish(new AttributeDeletedEvent(this.identity.address.toString(), attribute))
    }

    public async succeedRepositoryAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)

        if (validate) {
            const validationResult = await this.validateRepositoryAttributeSuccession(
                predecessorId,
                parsedSuccessorParams
            )
            if (validationResult.isError()) {
                throw validationResult.error
            }
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        })

        this.eventBus.publish(
            new RepositoryAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor)
        )

        return { predecessor, successor }
    }

    public async succeedOwnSharedIdentityAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)

        if (validate) {
            const validationResult = await this.validateOwnSharedIdentityAttributeSuccession(
                predecessorId,
                parsedSuccessorParams
            )
            if (validationResult.isError()) {
                throw validationResult.error
            }
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        })

        this.eventBus.publish(
            new OwnSharedAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor)
        )

        return { predecessor, successor }
    }

    public async succeedOwnSharedRelationshipAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)

        if (validate) {
            const validationResult = await this.validateOwnSharedRelationshipAttributeSuccession(
                predecessorId,
                parsedSuccessorParams
            )
            if (validationResult.isError()) {
                throw validationResult.error
            }
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        })

        this.eventBus.publish(
            new OwnSharedAttributeSucceededEvent(this.identity.address.toString(), predecessor, successor)
        )

        return { predecessor, successor }
    }

    public async succeedPeerSharedIdentityAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)

        if (validate) {
            const validationResult = await this.validatePeerSharedIdentityAttributeSuccession(
                predecessorId,
                parsedSuccessorParams
            )
            if (validationResult.isError()) {
                throw validationResult.error
            }
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        })

        /* No succeeded attribute event fired here. This is done by the notification system. */

        return { predecessor, successor }
    }

    public async succeedPeerSharedRelationshipAttribute(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON,
        validate = true
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)

        if (validate) {
            const validationResult = await this.validatePeerSharedRelationshipAttributeSuccession(
                predecessorId,
                parsedSuccessorParams
            )
            if (validationResult.isError()) {
                throw validationResult.error
            }
        }

        const { predecessor, successor } = await this._succeedAttributeUnsafe(predecessorId, {
            id: parsedSuccessorParams.id,
            content: parsedSuccessorParams.content,
            succeeds: predecessorId,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId,
            createdAt: parsedSuccessorParams.createdAt,
            succeededBy: parsedSuccessorParams.succeededBy
        })

        /* No succeeded attribute event fired here. This is done by the notification system. */

        return { predecessor, successor }
    }

    private async _succeedAttributeUnsafe(
        predecessorId: CoreId,
        successorParams: Parameters<typeof this.createAttributeUnsafe>[0]
    ): Promise<{ predecessor: LocalAttribute; successor: LocalAttribute }> {
        const successor = await this.createAttributeUnsafe({
            id: successorParams.id,
            content: successorParams.content,
            succeeds: predecessorId,
            shareInfo: successorParams.shareInfo,
            parentId: successorParams.parentId,
            createdAt: successorParams.createdAt,
            succeededBy: successorParams.succeededBy
        })

        const predecessor = (await this.getLocalAttribute(predecessorId))!
        predecessor.succeededBy = successor.id
        await this.updateAttributeUnsafe(predecessor)

        return { predecessor, successor }
    }

    public async validateRepositoryAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.genericValidationError(e))
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams)
        if (commonValidation.isError()) return commonValidation

        const predecessor = (await this.getLocalAttribute(predecessorId))!
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        })

        if (!predecessor.isIdentityAttribute() || predecessor.isShared()) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidPredecessor("Predecessor is not a valid repository attribute.")
            )
        }

        if (!successor.isIdentityAttribute() || successor.isShared()) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidPredecessor("Successor is not a valid repository attribute.")
            )
        }

        return ValidationResult.success()
    }

    public async validateOwnSharedIdentityAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.genericValidationError(e))
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams)
        if (commonValidation.isError()) return commonValidation

        const predecessor = (await this.getLocalAttribute(predecessorId))!
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        })

        if (!predecessor.isOwnSharedIdentityAttribute(this.identity.address)) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidPredecessor("Predecessor is not a valid own shared identity attribute.")
            )
        }

        if (!successor.isOwnSharedIdentityAttribute(this.identity.address)) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidSuccessor("Successor is not a valid peer shared identity attribute.")
            )
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer())
        }

        /* Succession of own shared identity attribute must have
         * respective repository attributes. */
        const predecessorSource = await this.getLocalAttribute(predecessor.shareInfo.sourceAttribute)
        const successorSource = await this.getLocalAttribute(successor.shareInfo.sourceAttribute)
        const predecessorSourceVersionIds = (
            await this.getVersionsOfAttribute(predecessor.shareInfo.sourceAttribute)
        ).map((x) => x.id.toString())
        const successorSourceVersionIds = (await this.getVersionsOfAttribute(successor.shareInfo.sourceAttribute)).map(
            (x) => x.id.toString()
        )
        if (typeof predecessorSource === "undefined" || !predecessorSource.isRepositoryAttribute()) {
            return ValidationResult.error(CoreErrors.attributes.invalidSuccessionOfOwnSharedIdentityAttribute())
        }
        if (typeof successorSource === "undefined" || !successorSource.isRepositoryAttribute()) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidSuccessionOfOwnSharedIdentityAttribute(
                    "Source attribute is not a valid repository attribute."
                )
            )
        }
        if (
            typeof successorSource.succeeds === "undefined" ||
            !predecessorSourceVersionIds.some((id) => id === successorSource.succeeds?.toString()) ||
            typeof predecessorSource.succeededBy === "undefined" ||
            !successorSourceVersionIds.some((id) => id === predecessorSource.succeededBy?.toString())
        ) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidSuccessionOfOwnSharedIdentityAttribute(
                    "Predecessor source attribute is not succeeded by successor source attribute."
                )
            )
        }

        const repositoryAttributeContentMatchesItsSharedAttribute =
            _.isEqual(predecessorSource.content, predecessor.content) &&
            _.isEqual(successorSource.content, successor.content)
        if (!repositoryAttributeContentMatchesItsSharedAttribute) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidSuccessionOfOwnSharedIdentityAttribute(
                    "Successor source attribute contents don't match successor shared attribute copy."
                )
            )
        }

        return ValidationResult.success()
    }

    public async validateOwnSharedRelationshipAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.genericValidationError(e))
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams)
        if (commonValidation.isError()) return commonValidation

        const predecessor = (await this.getLocalAttribute(predecessorId))!
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        })

        if (!predecessor.isOwnSharedRelationshipAttribute(this.identity.address)) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidPredecessor(
                    "Predecessor is not a valid own shared relationship attribute."
                )
            )
        }

        if (!successor.isOwnSharedRelationshipAttribute(this.identity.address)) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidSuccessor("Successor is not a valid own shared relationship attribute.")
            )
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeKey())
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer())
        }

        return ValidationResult.success()
    }

    public async validatePeerSharedIdentityAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.genericValidationError(e))
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams)
        if (commonValidation.isError()) return commonValidation

        const predecessor = (await this.getLocalAttribute(predecessorId))!
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        })

        if (!predecessor.isPeerSharedIdentityAttribute()) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidPredecessor("Predecessor is not a valid peer shared identity attribute.")
            )
        }

        if (!successor.isPeerSharedIdentityAttribute()) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidSuccessor("Successor is not a valid peer shared identity attribute.")
            )
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer())
        }

        return ValidationResult.success()
    }

    public async validatePeerSharedRelationshipAttributeSuccession(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.genericValidationError(e))
        }

        const commonValidation = await this.validateAttributeSuccessionCommon(predecessorId, parsedSuccessorParams)
        if (commonValidation.isError()) return commonValidation

        const predecessor = (await this.getLocalAttribute(predecessorId))!
        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        })

        if (!predecessor.isPeerSharedRelationshipAttribute()) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidPredecessor(
                    "Predecessor is not a valid peer shared relationship attribute."
                )
            )
        }

        if (!successor.isPeerSharedRelationshipAttribute()) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidSuccessor("Successor is not a valid peer shared relationship attribute.")
            )
        }

        if (successor.content.key !== predecessor.content.key) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeKey())
        }

        if (!predecessor.shareInfo.peer.equals(successor.shareInfo.peer)) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangePeer())
        }

        return ValidationResult.success()
    }

    public async validateAttributeSuccessionCommon(
        predecessorId: CoreId,
        successorParams: IAttributeSuccessorParams | AttributeSuccessorParamsJSON
    ): Promise<ValidationResult> {
        let parsedSuccessorParams
        try {
            parsedSuccessorParams = AttributeSuccessorParams.from(successorParams)
        } catch (e: unknown) {
            return ValidationResult.error(CoreErrors.attributes.genericValidationError(e))
        }

        const successor = LocalAttribute.from({
            id: CoreId.from(parsedSuccessorParams.id ?? "dummy"),
            content: parsedSuccessorParams.content,
            createdAt: parsedSuccessorParams.createdAt ?? CoreDate.utc(),
            succeeds: parsedSuccessorParams.succeeds,
            succeededBy: parsedSuccessorParams.succeededBy,
            shareInfo: parsedSuccessorParams.shareInfo,
            parentId: parsedSuccessorParams.parentId
        })

        if (typeof parsedSuccessorParams.id !== "undefined") {
            const successor = await this.getLocalAttribute(CoreId.from(parsedSuccessorParams.id))
            if (typeof successor !== "undefined") {
                return ValidationResult.error(CoreErrors.attributes.successorMustNotYetExist())
            }
        }

        if (typeof successor.succeeds !== "undefined" && !predecessorId.equals(successor.succeeds.toString())) {
            return ValidationResult.error(
                CoreErrors.attributes.invalidPredecessor(
                    "The predecessor's id and the explicitly set value for the successor's succeeds field don't match."
                )
            )
        }

        if (typeof successor.succeededBy !== "undefined") {
            return ValidationResult.error(CoreErrors.attributes.successorMustNotHaveASuccessor())
        }

        if (typeof successor.parentId !== "undefined") {
            return ValidationResult.error(
                CoreErrors.attributes.cannotSucceedPartOfComplexAttribute(predecessorId.toString())
            )
        }

        const predecessor = await this.getLocalAttribute(predecessorId)
        if (typeof predecessor === "undefined") {
            return ValidationResult.error(CoreErrors.attributes.predecessorDoesNotExist())
        }

        if (typeof predecessor.succeededBy !== "undefined") {
            return ValidationResult.error(
                CoreErrors.attributes.cannotSucceedAttributesWithASuccessor(predecessor.succeededBy.toString())
            )
        }

        if (typeof predecessor.parentId !== "undefined") {
            return ValidationResult.error(
                CoreErrors.attributes.cannotSucceedPartOfComplexAttribute(predecessorId.toString())
            )
        }

        if (!predecessor.content.owner.equals(CoreAddress.from(successor.content.owner))) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeOwner())
        }

        if (successor.content.constructor !== predecessor.content.constructor) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeContentType())
        }

        if (predecessor.content.value.constructor !== successor.content.value.constructor) {
            return ValidationResult.error(CoreErrors.attributes.successionMustNotChangeValueType())
        }

        return ValidationResult.success()
    }

    public async createAttributeUnsafe(
        attributeData: Omit<ILocalAttribute, "id" | "createdAt"> & { id?: ICoreId; createdAt?: ICoreDate }
    ): Promise<LocalAttribute> {
        const localAttribute = LocalAttribute.from({
            id: attributeData.id ?? (await ConsumptionIds.attribute.generate()),
            content: attributeData.content,
            createdAt: attributeData.createdAt ?? CoreDate.utc(),
            shareInfo: attributeData.shareInfo,
            parentId: attributeData.parentId,
            succeededBy: attributeData.succeededBy,
            succeeds: attributeData.succeeds
        })
        await this.attributes.create(localAttribute)
        return localAttribute
    }

    public async updateAttributeUnsafe(attributeParams: ILocalAttribute): Promise<LocalAttribute> {
        const doc = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: attributeParams.id.toString()
        })
        if (!doc) {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attributeParams.id.toString())
        }

        const params: ILocalAttribute = {
            id: attributeParams.id,
            content: attributeParams.content,
            createdAt: attributeParams.createdAt,
            parentId: attributeParams.parentId,
            shareInfo: attributeParams.shareInfo,
            succeededBy: attributeParams.succeededBy,
            succeeds: attributeParams.succeeds
        }
        const newAttribute = LocalAttribute.from(params)
        await this.attributes.update(doc, newAttribute)
        return newAttribute
    }

    public async deleteAttributeUnsafe(id: CoreId): Promise<void> {
        await this.attributes.delete({ id: id })
    }

    public async getVersionsOfAttribute(id: CoreId): Promise<LocalAttribute[]> {
        let attribute = await this.getLocalAttribute(id)
        if (typeof attribute === "undefined") {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString())
        }

        let i = 0
        while (attribute.succeededBy && i < 1000) {
            const successor = await this.getLocalAttribute(attribute.succeededBy)
            if (!successor) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.succeededBy.toString())
            }

            attribute = successor
            i++
        }

        let j = 0
        const attributeVersions: LocalAttribute[] = [attribute]
        while (attribute.succeeds && j < 1000) {
            const predecessor = await this.getLocalAttribute(attribute.succeeds)
            if (!predecessor) {
                throw TransportCoreErrors.general.recordNotFound(LocalAttribute, attribute.succeeds.toString())
            }

            attribute = predecessor
            attributeVersions.push(attribute)
            j++
        }

        return attributeVersions
    }

    public async getSharedVersionsOfRepositoryAttribute(
        id: CoreId,
        peers?: CoreAddress[],
        onlyLatestVersions = true
    ): Promise<LocalAttribute[]> {
        let repositoryAttribute = await this.getLocalAttribute(id)
        if (typeof repositoryAttribute === "undefined") {
            throw TransportCoreErrors.general.recordNotFound(LocalAttribute, id.toString())
        }

        if (!repositoryAttribute.isRepositoryAttribute()) {
            throw CoreErrors.attributes.invalidPropertyValue("Attribute '${id}' isn't a RepositoryAttribute.")
        }

        let i = 0
        while (repositoryAttribute.succeededBy && i < 1000) {
            const successor = await this.getLocalAttribute(repositoryAttribute.succeededBy)
            if (!successor) {
                throw TransportCoreErrors.general.recordNotFound(
                    LocalAttribute,
                    repositoryAttribute.succeededBy.toString()
                )
            }

            repositoryAttribute = successor
            i++
        }

        const query: any = { "shareInfo.sourceAttribute": repositoryAttribute.id.toString() }

        if (typeof peers !== "undefined") {
            query["shareInfo.peer"] = { $in: peers.map((address) => address.toString()) }
        }

        if (onlyLatestVersions) {
            query["succeededBy"] = { $exists: false }
        }

        const ownSharedIdentityAttributeVersions: LocalAttribute[] = await this.getLocalAttributes(query)

        let j = 0
        while (repositoryAttribute.succeeds && j < 1000) {
            const predecessor = await this.getLocalAttribute(repositoryAttribute.succeeds)
            if (!predecessor) {
                throw TransportCoreErrors.general.recordNotFound(
                    LocalAttribute,
                    repositoryAttribute.succeeds.toString()
                )
            }

            repositoryAttribute = predecessor

            query["shareInfo.sourceAttribute"] = repositoryAttribute.id.toString()
            const sharedCopies = await this.getLocalAttributes(query)

            ownSharedIdentityAttributeVersions.push(...sharedCopies)
            j++
        }

        return ownSharedIdentityAttributeVersions
    }
}
