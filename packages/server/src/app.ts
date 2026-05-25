import { AdminRoute } from "./route/admin_route";
import { ApiRoute } from "./route/api_route";
import { AdminArticleRoute } from "./route/article_route";
import { AssetsRoute } from "./route/assets_route";
import { RootRoute } from "./route/root_route";
import { TestRoute } from "./route/test_route";
import Server from "./server/server";
import {
  ApiDocCollector,
  ApiDocCollectorVoidImpl,
} from "./utils/api_doc_collector";

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

  api.setRoute(new TestRoute(apiDocCollector));
  api.setRoute(new AdminRoute(apiDocCollector));
  api.setRoute(new AdminArticleRoute(apiDocCollector));
  api.setRoute(new AssetsRoute());

  return route;
}
