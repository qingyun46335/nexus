import { Hono } from 'hono'
import { Route, RouteEnv } from '../router/route'
import { Result } from '../utils/result'

export default class Server {

    private hono: Hono<RouteEnv> | null = null
    private route: Route

    constructor() {
        this.route = new Route()
    }

    init() {

    }

    start(): Result<Hono<RouteEnv>> {
        // const { e: startError } = this.route
        // if (startError) {
        //     console.error("Failed to start server:", startError)
        // }
        return this.route.route()
    }

    server(): { router: Route } {
        return { router: this.route }
    }


}