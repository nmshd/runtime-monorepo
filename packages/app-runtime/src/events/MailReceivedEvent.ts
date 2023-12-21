import { DataEvent, MailDVO } from "@vermascht/runtime"

export class MailReceivedEvent extends DataEvent<MailDVO> {
    public static readonly namespace: string = "app.mailReceived"

    public constructor(address: string, message: MailDVO) {
        super(MailReceivedEvent.namespace, address, message)
    }
}
