import { AbstractAttributeValueJSON, IAbstractAttributeValue } from "../../AbstractAttributeValue"
import { IValueHintsOverride, ValueHintsOverrideJSON } from "../../hints"

export interface ProprietaryAttributeValueJSON extends AbstractAttributeValueJSON {
    title: string
    description?: string
    valueHintsOverride?: ValueHintsOverrideJSON
}

export interface IProprietaryAttributeValue extends IAbstractAttributeValue {
    title: string
    description?: string
    valueHintsOverride?: IValueHintsOverride
}

export const PROPRIETARY_ATTRIBUTE_MAX_TITLE_LENGTH = 100
export const PROPRIETARY_ATTRIBUTE_MAX_DESCRIPTION_LENGTH = 1000
