import { Hono } from 'hono'
import { Router } from './../router/router'
import { BlankEnv, BlankSchema } from 'hono/types'
import { Result } from '../utils/result'

export default class Server {
    private hono: Hono<BlankEnv, BlankSchema, "/"> | null = null

    private router: Router

    getHono(): Result<Hono<BlankEnv, BlankSchema, "/">> {
        if (this.hono == null) {
            this.hono = new Hono()
        }
        return {v: this.hono, e: null}
    }

    constructor() {
        this.router = new Router(() => this.getHono())
    }

    init() {
        
    }

    start() {
        this.router.start()
    }

    server(): {router: Router} {
        return {router: this.router}
    }


}