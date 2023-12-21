import { AppConfig, AppRuntime } from "@vermascht/app-runtime"
import { NativeBootstrapperMock } from "../mocks/NativeBootstrapperMock"
import { FakeUIBridge } from "./FakeUIBridge"

export abstract class AbstractTest {
    protected runtime: AppRuntime

    public constructor(public readonly config: AppConfig) {}

    public abstract run(): void

    protected async createRuntime(): Promise<void> {
        const nativeBootstrapperMock = new NativeBootstrapperMock()
        await nativeBootstrapperMock.init()
        this.runtime = await AppRuntime.create(nativeBootstrapperMock, this.config)
        this.runtime.registerUIBridge(new FakeUIBridge())
    }

    protected async createRuntimeWithoutInit(): Promise<void> {
        const nativeBootstrapperMock = new NativeBootstrapperMock()
        await nativeBootstrapperMock.init()
        this.runtime = new AppRuntime(nativeBootstrapperMock.nativeEnvironment, this.config)
    }
}
