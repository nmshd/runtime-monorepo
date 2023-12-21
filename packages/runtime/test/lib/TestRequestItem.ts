import { type } from "@js-soft/ts-serval";
import { IRequestItem, RequestItem } from "@vermascht/content";

export interface ITestRequestItem extends IRequestItem {}

@type("TestRequestItem")
export class TestRequestItem extends RequestItem implements ITestRequestItem {
    public static from(value: ITestRequestItem): TestRequestItem {
        return this.fromAny(value);
    }
}
