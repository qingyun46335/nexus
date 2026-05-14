import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { Route, VarsAndBindingsEnv } from "./route";
import { basicAuth } from "hono/basic-auth";

export type AdminRouteSetEnv = object

export type AdminRouteGetEnv = {
  requestId: string
  abc: string
}

export type AdminRouteBindingsEnv = {
  ADMIN_USER: string
  ADMIN_PASS: string
}

export class AdminRoute extends Route<VarsAndBindingsEnv<AdminRouteSetEnv, AdminRouteGetEnv, AdminRouteBindingsEnv>, AdminRouteSetEnv, AdminRouteGetEnv> {

  setRoutePrefix(): string | null {
    return "/admin"
  }

  midd(app: Hono<VarsAndBindingsEnv<AdminRouteSetEnv, AdminRouteGetEnv, AdminRouteBindingsEnv>, BlankSchema, "/">): Result<null> {
    app.use("*", async (c, next) => {
      const auth = basicAuth({
        username: c.env.ADMIN_USER as string,
        password: c.env.ADMIN_PASS as string,
      })
      console.log("pass: ", c.env.ADMIN_PASS)
      return auth(c, next)  // 这里的 c 才是请求上下文
    })
    return Ok(null)
  }
  method(app: Hono<VarsAndBindingsEnv<AdminRouteSetEnv, AdminRouteGetEnv, AdminRouteBindingsEnv>, BlankSchema, "/">): Result<null> {
    app.get("/test", (c) => {
      return c.html(html)
    })
    return Ok(null)
  }

}

const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>管理员后台</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }

    body {
      background: #f4f6f9;
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 220px;
      background: #1f2937;
      color: white;
      padding: 20px;
    }

    .sidebar h2 {
      margin-bottom: 30px;
      font-size: 24px;
    }

    .sidebar ul {
      list-style: none;
    }

    .sidebar li {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 10px;
      transition: 0.2s;
    }

    .sidebar li:hover {
      background: #374151;
    }

    .main {
      flex: 1;
      padding: 30px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }

    .topbar h1 {
      font-size: 28px;
      color: #111827;
    }

    .user {
      background: white;
      padding: 10px 16px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
    }

    .card {
      background: white;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .card h3 {
      color: #6b7280;
      margin-bottom: 10px;
      font-size: 16px;
    }

    .card p {
      font-size: 28px;
      font-weight: bold;
      color: #111827;
    }

    .table-box {
      margin-top: 30px;
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    th, td {
      padding: 14px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      color: #6b7280;
    }

    .status {
      color: green;
      font-weight: bold;
    }
  </style>
</head>
<body>

  <div class="sidebar">
    <h2>Admin</h2>
    <ul>
      <li>首页</li>
      <li>用户管理</li>
      <li>订单管理</li>
      <li>系统设置</li>
    </ul>
  </div>

  <div class="main">
    <div class="topbar">
      <h1>管理员主页</h1>
      <div class="user">管理员：admin</div>
    </div>

    <div class="cards">
      <div class="card">
        <h3>今日访问</h3>
        <p>1,204</p>
      </div>

      <div class="card">
        <h3>新增用户</h3>
        <p>82</p>
      </div>

      <div class="card">
        <h3>订单数量</h3>
        <p>312</p>
      </div>

      <div class="card">
        <h3>系统状态</h3>
        <p style="color:green;">正常</p>
      </div>
    </div>

    <div class="table-box">
      <h2>最近登录记录</h2>

      <table>
        <thead>
          <tr>
            <th>用户</th>
            <th>时间</th>
            <th>IP</th>
            <th>状态</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>admin</td>
            <td>2026-05-08 14:30</td>
            <td>127.0.0.1</td>
            <td class="status">成功</td>
          </tr>

          <tr>
            <td>root</td>
            <td>2026-05-08 13:10</td>
            <td>192.168.1.5</td>
            <td class="status">成功</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</body>
</html>`