import { RuntimeServices } from "@vermascht/runtime"
import { AppServices } from "./extensibility"

export interface AppRuntimeServices extends RuntimeServices {
    appServices: AppServices
}
