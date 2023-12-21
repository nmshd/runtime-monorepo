import { LocalNotificationStatus } from "@vermascht/consumption";
import { NotificationJSON } from "@vermascht/content";

export interface LocalNotificationDTO {
    id: string;
    isOwn: boolean;
    peer: string;
    createdAt: string;
    receivedByDevice?: string;
    content: NotificationJSON;
    status: LocalNotificationStatus;
    source: {
        type: "Message";
        reference: string;
    };
}
