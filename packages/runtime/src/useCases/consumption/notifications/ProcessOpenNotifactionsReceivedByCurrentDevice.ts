import { ApplicationError, Result } from "@js-soft/ts-utils";
import { NotificationsController } from "@vermascht/consumption";
import { Inject } from "typescript-ioc";
import { UseCase } from "../../common";

export class ProcessOpenNotifactionsReceivedByCurrentDeviceUseCase extends UseCase<void, void> {
    public constructor(@Inject private readonly notificationsController: NotificationsController) {
        super();
    }

    protected async executeInternal(): Promise<Result<void, ApplicationError>> {
        await this.notificationsController.processOpenNotifactionsReceivedByCurrentDevice();

        return Result.ok(undefined);
    }
}
