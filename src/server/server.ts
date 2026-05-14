import { Env, Hono } from 'hono'
import { Result } from '../utils/result'
import { Route } from '../route/route'

export default class Server<E extends Env, S, G> {

    private route: Route<E, S, G>

    constructor(route: Route<E, S, G>) {
        this.route = route
    }

    init() {

    }

    start(): Result<Hono<E>> {
        return this.route.build()
    }

}