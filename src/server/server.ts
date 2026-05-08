import { Env, Hono } from 'hono'
import { Result } from '../utils/result'
import { Route } from '../route/route'

export default class Server<E extends Env> {

    private route: Route<E>

    constructor(route: Route<E>) {
        this.route = route
    }

    init() {

    }

    start(): Result<Hono<E>> {
        return this.route.build()
    }

}