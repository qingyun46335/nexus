export type Tag = {
    id: string,
    name: string,
    count: number,
    status: "active" | "inactive",
}

export type TagClientVo = {
    id: string,
    name: string,
    count: number,
}