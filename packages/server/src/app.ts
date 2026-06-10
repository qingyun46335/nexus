import { AdminRoute } from "./route/admin/admin_route";
import { ApiRoute } from "./route/api_route";
import { AdminArticleRoute } from "./route/admin/article_route";
import { AdminAssetsRoute } from "./route/admin/assets_route";
import { RootRoute } from "./route/root_route";
import { AdminTagRoute } from "./route/admin/tag_route";
import Server from "./server/server";
import {
  ApiDocCollector,
  ApiDocCollectorVoidImpl,
} from "./utils/api_doc_collector";
import { AdminStatsRoute } from "./route/admin/stats_route";
import { ClientRoute } from "./route/client/client_route";
import { ArticleRoute } from "./route/client/article_route";
import { AssetsRoute } from "./route/client/assets_route";
import { TagRoute } from "./route/client/tag_toute";

export function createApp(apiDocCollector?: ApiDocCollector) {
  const route = createRoute(apiDocCollector);

  const server = new Server(route);

  server.init();

  return server.start();
}

export function createRoute(apiDocCollector?: ApiDocCollector): RootRoute {
  if (!apiDocCollector) {
    apiDocCollector = new ApiDocCollectorVoidImpl();
  }

  const route = new RootRoute();

  route.notFound();
  route.onError();

  const api = route.setRoute(new ApiRoute(apiDocCollector));

  const admin = api.setRoute(new AdminRoute(apiDocCollector));
  admin.setRoute(new AdminArticleRoute(apiDocCollector));
  admin.setRoute(new AdminAssetsRoute());
  admin.setRoute(new AdminTagRoute(apiDocCollector))
  admin.setRoute(new AdminStatsRoute(apiDocCollector))

  const client = api.setRoute(new ClientRoute(apiDocCollector))
  client.setRoute(new ArticleRoute(apiDocCollector))
  client.setRoute(new AssetsRoute(apiDocCollector))
  client.setRoute(new TagRoute(apiDocCollector))

  return route;
}
