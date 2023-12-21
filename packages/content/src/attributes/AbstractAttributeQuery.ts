import { CoreSerializable, ICoreSerializable } from "@vermascht/transport"
import { ContentJSON } from "../ContentJSON"

export interface AbstractAttributeQueryJSON extends ContentJSON {}
export interface IAbstractAttributeQuery extends ICoreSerializable {}
export abstract class AbstractAttributeQuery extends CoreSerializable implements IAbstractAttributeQuery {}
