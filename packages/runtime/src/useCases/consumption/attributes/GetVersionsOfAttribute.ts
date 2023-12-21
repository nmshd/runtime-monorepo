import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute } from "@vermascht/consumption";
import { CoreId } from "@vermascht/transport";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { AttributeIdString, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetVersionsOfAttributeRequest {
    attributeId: AttributeIdString;
}

class Validator extends SchemaValidator<GetVersionsOfAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetVersionsOfAttributeRequest"));
    }
}

export class GetVersionsOfAttributeUseCase extends UseCase<GetVersionsOfAttributeRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetVersionsOfAttributeRequest): Promise<Result<LocalAttributeDTO[]>> {
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(request.attributeId));
        if (typeof attribute === "undefined") {
            throw RuntimeErrors.general.recordNotFound(LocalAttribute);
        }

        const allVersions = await this.attributeController.getVersionsOfAttribute(CoreId.from(request.attributeId));

        return Result.ok(AttributeMapper.toAttributeDTOList(allVersions));
    }
}
