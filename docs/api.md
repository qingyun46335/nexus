
# GET /api/test/test

请求测试


## Params





## Body




---

# GET /api/admin/article/selectArticle

分页接口


## Params

- `page`: 页数
- `pageSize`: 单页条数
- `keyword`: 模糊查询关键字
- `dateIntervalType`: 创建或更新时间区间查询
- `dateFrom`: 区间起始
- `dateTo`: 区间结束
- `tags`: 添加的标签



## Body




---

# GET /api/admin/article/selectArticleFiles

子表全量查询


## Params

- `articleId`: 所属文章id



## Body




---

# POST /api/admin/article/prepare

预上传接口


## Params

- `filesNum`: 文件总数



## Body




---

# POST /api/admin/article/upload

文章拥有文件上传


## Params

- `uploadId`: 上传id，与articleId是指一致
- `fileMeta`: 文件信息
- `file`: 文件本身



## Body




---

# POST /api/admin/article/upload_after

上传后处理接口


## Params

- `uploadId`: 上传id，与articleId是指一致



## Body




---

# GET /api/admin/article/getArticle

根据id 搜索单条文章数据


## Params

- `articleId`: 文章id



## Body




---

# POST /api/admin/article/updArticleInfor

更新文章信息


## Params

- `article`: 文章信息更新数据
- `articleId`: 文章id



## Body




---

# GET /api/admin/tag/selectTags

查询所有的标签


## Params





## Body




---

# GET /api/admin/tag/getArticleToTagIds

查询文章关联的标签id列表


## Params

- `articleId`: 文章id



## Body




---

# POST /api/admin/tag/addTag

添加标签


## Params

- `tag`: 标签名称



## Body




---

# POST /api/admin/tag/updTagStatus

更新标签状态


## Params

- `tagId`: 标签id
- `tagStatus`: 预备设置标签状态



## Body




---

# POST /api/admin/tag/delTags

标签删除


## Params

- `tagId`: 标签id



## Body




---

# POST /api/admin/login

管理员登录


## Params





## Body

- `username`: string
- `password`: string


---

# GET /api/verify

token 手动校验接口


## Params

- `authorization`: string



## Body




---

# GET /api/access

短期token申请


## Params





## Body



