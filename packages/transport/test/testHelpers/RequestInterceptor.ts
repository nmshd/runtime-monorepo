import { RESTClient } from "@vermascht/transport"
import { AxiosRequestConfig, AxiosResponse, Method } from "axios"

export class RequestInterceptor {
    protected _measuringRequests = true
    public get measuringRequests(): boolean {
        return this._measuringRequests
    }
    protected _requests: AxiosRequestConfig[] = []
    public get requests(): AxiosRequestConfig[] {
        return this._requests
    }
    protected _responses: AxiosResponse[] = []
    public get responses(): AxiosResponse[] {
        return this._responses
    }
    protected _client: RESTClient
    public get controller(): RESTClient {
        return this._client
    }
    private oldCreateAxios: any

    public constructor(client: RESTClient) {
        this._client = client
        this._measuringRequests = true
        this.injectToClient(client)
    }

    private injectToClient(client: RESTClient) {
        const that = this
        const anyC = client as any
        this.oldCreateAxios = anyC.createAxios
        function newCreateAxios() {
            const axiosInstance = that.oldCreateAxios.apply(anyC)
            axiosInstance.interceptors.request.use((req: AxiosRequestConfig) => {
                if (!that._measuringRequests) return req
                that._requests.push(req)
                return req
            })
            axiosInstance.interceptors.response.use((res: AxiosResponse) => {
                if (!that._measuringRequests) return res
                that._responses.push(res)
                return res
            })
            return axiosInstance
        }
        anyC.createAxios = newCreateAxios
    }

    public start(): this {
        this._measuringRequests = true
        this.reset()
        return this
    }

    private reset() {
        this._requests = []
        this._responses = []
    }

    public stop(): Communication {
        this._measuringRequests = false
        return new Communication(this.requests, this.responses)
    }
}

class Communication {
    public constructor(
        public readonly requests: AxiosRequestConfig[],
        public readonly responses: AxiosResponse<any>[]
    ) {}

    public getRequests(filter: { method: Method; urlSubstring: string }) {
        return this.requests.filter(
            (r) =>
                r.url!.toLowerCase().includes(filter.urlSubstring.toLowerCase()) &&
                r.method?.toLowerCase() === filter.method.toLowerCase()
        )
    }
}
