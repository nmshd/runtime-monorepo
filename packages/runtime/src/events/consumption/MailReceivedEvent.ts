import { Mail } from "@vermascht/content";
import { MessageDTO } from "../../types";
import { DataEvent } from "../DataEvent";

export class MailReceivedEvent extends DataEvent<MessageDTO> {
    public static readonly namespace = "consumption.mailReceived";

    public constructor(
        eventTargetAddress: string,
        public readonly mail: Mail,
        data: MessageDTO
    ) {
        super(MailReceivedEvent.namespace, eventTargetAddress, data);
    }
}
