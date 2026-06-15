// ============================================================
// example-usage.ts — 父组件（article-page）接入示例
// 演示如何用事件驱动模式把 nexus-comment 接入 axios
// ============================================================

import { LitElement, html } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import axios from 'axios'
import type { NexusComment } from './nexus-comment.js'
import type {
  CommentSubmitPayload,
  PagedResult,
  TopComment,
  SubComment,
  NewTopComment,
  NewSubComment,
} from '../../type/comment-types.js'
import './nexus-comment.js'

@customElement('article-page')
export class ArticlePage extends LitElement {
  @property({ type: Number, attribute: 'article-id' }) articleId = 0

  @query('nexus-comment') private _commentEl!: NexusComment

  // 监听顶楼分页请求
  private async _onLoadTopPage(e: CustomEvent) {
    const { articleId, page, pageSize } = e.detail as {
      articleId: number; page: number; pageSize: number
    }
    try {
      const { data } = await axios.get<PagedResult<TopComment>>('/api/comments', {
        params: { articleId, page, pageSize },
      })
      this._commentEl.setTopPage(data)
    } catch (err) {
      console.error('加载评论失败', err)
      // 可以在这里展示 toast
    }
  }

  // 监听子楼分页请求
  private async _onLoadSubPage(e: CustomEvent) {
    // 注意：子楼的 load-sub-page 会从 nexus-sub-comments 冒泡上来，
    // 但 nexus-comment 内部会拦截一次并重新 dispatch，
    // 所以这里直接监听 nexus-comment 上的即可
    const { parentId, page, pageSize } = e.detail as {
      parentId: number; page: number; pageSize: number
    }
    try {
      const { data } = await axios.get<PagedResult<SubComment>>('/api/comments/replies', {
        params: { parentId, page, pageSize },
      })
      this._commentEl.setSubPage(parentId, data)
    } catch (err) {
      console.error('加载回复失败', err)
    }
  }

  // 监听发表评论
  private async _onCommentSubmit(e: CustomEvent) {
    const payload = e.detail as CommentSubmitPayload

    try {
      if (payload.parentId !== undefined) {
        // 子评论
        const { data } = await axios.post<NewSubComment>('/api/comments/reply', {
          ...payload,
          articleId: this.articleId,
        })
        this._commentEl.addSubComment(data)
      } else {
        // 顶楼评论
        const { data } = await axios.post<NewTopComment>('/api/comments', {
          ...payload,
          articleId: this.articleId,
        })
        this._commentEl.addTopComment(data)
      }
    } catch (err) {
      console.error('发表评论失败', err)
      this._commentEl.submitError()
      // 在这里展示 toast 提示失败
    }
  }

  render() {
    return html`
      <!-- ... 文章正文 ... -->

      <nexus-comment
        article-id="${this.articleId}"
        top-page-size="10"
        sub-page-size="5"
        @load-top-page=${this._onLoadTopPage}
        @load-sub-page=${this._onLoadSubPage}
        @comment-submit=${this._onCommentSubmit}
      ></nexus-comment>
    `
  }
}

// ============================================================
// 后端接口约定（供参考）
//
// GET /api/comments?articleId=&page=&pageSize=
//   → PagedResult<TopComment>
//   TopComment.replies 返回前 subPageSize 条
//
// GET /api/comments/replies?parentId=&page=&pageSize=
//   → PagedResult<SubComment>
//
// POST /api/comments
//   body: { content, authorName, authorEmail, articleId }
//   → NewTopComment（新建的顶楼评论，replies=[], replyCount=0）
//
// POST /api/comments/reply
//   body: { content, authorName, authorEmail, articleId, parentId, replyToName }
//   → NewSubComment（新建的子评论，含 parentId）
// ============================================================
