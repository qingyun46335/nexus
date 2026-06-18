export interface FriendLink {
    id: string;
    name: string;        // 站名
    url: string;         // 链接
    avatar: string;      // 头像/favicon URL
    description: string; // 一句话介绍
    author: string;      // 作者名
    status: 1 | 0;
}

export interface FriendLinkVo {
    id: string;
    name: string;        // 站名
    url: string;         // 链接
    avatar: string;      // 头像/favicon URL
    description: string; // 一句话介绍
    author: string;      // 作者名
}